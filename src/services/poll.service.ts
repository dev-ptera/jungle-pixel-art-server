import { Subject } from 'rxjs';
import { AccountHistoryResponse } from '@dev-ptera/nano-node-rpc';
import { sleep } from './utils';
import { getAccountHistory, getAccountInfoBlockCount } from '../rpc';
import { ACCOUNT_HISTORY_ERROR, BLOCK_COUNT_ERROR, LOG, PAYMENT_ADDRESSES, PENDING_PAYMENTS } from '../config';

export const newBlocksSubject = new Subject<AccountHistoryResponse>();

/** Listens for incoming payments at a given address, refreshing at a given timeout.
 *  If there are no pending payments for the given address, there is no additional action taken for an iteration.
 * */
const _pollAddress = async (addr, timeout): Promise<void> => {
    let breakIteration;
    let startBlockCount;
    let refreshBlockCount = true;
    let pendingPayments = 0;

    while (true) {
        await sleep(timeout);
        const transactionCountChanged = PENDING_PAYMENTS[addr].size !== pendingPayments;
        pendingPayments = PENDING_PAYMENTS[addr].size;

        if (!pendingPayments) {
            refreshBlockCount = true; // Only refresh block count when there are no pending payments.
            continue;
        }

        if (transactionCountChanged) {
            console.log(`[INFO]: (${pendingPayments}) pending payments for address ${addr}; poll for payment.`);
        } else {
            console.log(`[INFO]: (${pendingPayments}) ${addr}`);
        }

        breakIteration = false;
        if (refreshBlockCount) {
            startBlockCount = await getAccountInfoBlockCount(addr).catch((err) => {
                LOG(BLOCK_COUNT_ERROR(addr), err);
                breakIteration = true;
            });
            if (breakIteration) {
                continue;
            }
            refreshBlockCount = false;
        }

        const recentBlocks = (await getAccountHistory(addr, startBlockCount).catch((err) => {
            LOG(ACCOUNT_HISTORY_ERROR(addr, startBlockCount), err);
            breakIteration = true;
        })) as AccountHistoryResponse;
        if (breakIteration) {
            continue;
        }

        if (recentBlocks.history) {
            newBlocksSubject.next(recentBlocks);
            await sleep(timeout); // This prevents the next loop starting before payment can be processed.
        }
    }
};

/** Setup payment addresses to accept incoming transactions.  */
export const pollService = async (): Promise<void> => {
    _pollAddress(PAYMENT_ADDRESSES[0], 2000).catch(console.error);
    _pollAddress(PAYMENT_ADDRESSES[1], 5000).catch(console.error);
    _pollAddress(PAYMENT_ADDRESSES[2], 5000).catch(console.error);
};
