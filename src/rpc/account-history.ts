import { nanoClient } from '../app.config';
import { AccountHistoryResponse } from '@dev-ptera/nano-node-rpc';

export const getAccountHistory = async (address): Promise<any> =>
    nanoClient
        .account_history(address, 5)
        .then((accountHistory: AccountHistoryResponse) => Promise.resolve(accountHistory.history))
        .catch((err) => Promise.reject(err));
