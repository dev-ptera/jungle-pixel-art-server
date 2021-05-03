import { AccountInfoResponse } from '@dev-ptera/nano-node-rpc';
import { NANO_CLIENT } from '../../config';

export const getAccountInfoBlockCount = (address): Promise<number> =>
    NANO_CLIENT.account_info(address, {})
        .then((data: AccountInfoResponse) => Promise.resolve(data.block_count))
        .catch((err) => Promise.reject(err));
