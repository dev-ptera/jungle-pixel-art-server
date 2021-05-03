import { AccountHistoryResponse } from '@dev-ptera/nano-node-rpc';
import { NANO_CLIENT } from '../../config';

export const getAccountHistory = async (address, blockHeight): Promise<AccountHistoryResponse> =>
    NANO_CLIENT.account_history(address, -1, {
        offset: blockHeight,
        reverse: true,
    })
        .then((accountHistory: AccountHistoryResponse) => Promise.resolve(accountHistory))
        .catch((err) => Promise.reject(err));
