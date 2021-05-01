import { nanoClient } from '../app.config';
import { AccountInfoResponse } from '@dev-ptera/nano-node-rpc';

export const getAccountInfo = (address): Promise<AccountInfoResponse> =>
    nanoClient
        .account_info(address, {})
        .then((data) => Promise.resolve(data))
        .catch((err) => Promise.reject(err));
