import { Subject } from 'rxjs';
import { getAccountInfo } from '../rpc/account-info';
import { PAYMENT_ADDRESSES, PENDING_PAYMENTS } from '../app.config';
import { getAccountHistory } from '../rpc/account-history';
import { AccountHistoryResponse } from '@dev-ptera/nano-node-rpc';
import { sleep } from './util';
import { ACCOUNT_HISTORY_ERROR, BLOCK_COUNT_ERROR, LOG } from '../error';

export const newBlocksSubject = new Subject<AccountHistoryResponse>();

const _getBlockCount = (addr): Promise<number> => {
    return getAccountInfo(addr)
        .then((accountInfo) => Promise.resolve(accountInfo.block_count))
        .catch((err) => Promise.reject(err));
};

/* accept addresssss */
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
            startBlockCount = await _getBlockCount(addr).catch((err) => {
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

export const poll = async (): Promise<void> => {
    _pollAddress(PAYMENT_ADDRESSES[0], 2000).catch(console.error);
    _pollAddress(PAYMENT_ADDRESSES[1], 5000).catch(console.error);
    _pollAddress(PAYMENT_ADDRESSES[2], 5000).catch(console.error);
};
