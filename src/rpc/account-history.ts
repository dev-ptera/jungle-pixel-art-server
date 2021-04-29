import { nanoClient } from '../app.config';
import { AccountHistoryResponse } from '@dev-ptera/nano-node-rpc';

export const getAccountHistory = async (address, blockHeight): Promise<AccountHistoryResponse> =>
    nanoClient
        .account_history(address, -1, {
            offset: blockHeight,
            reverse: true,
        })
        .then((accountHistory: AccountHistoryResponse) => Promise.resolve(accountHistory))
        .catch((err) => Promise.reject(err));
