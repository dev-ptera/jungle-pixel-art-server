import {nanoClient} from '../app.config';
import {AccountsPendingResponse} from '@dev-ptera/nano-node-rpc';

export const getPending = async (address): Promise<any> =>
    nanoClient
        .accounts_pending([address], -1, { threshold: "1000000000000000000000000"})
        .then((pendingResponse: AccountsPendingResponse) => Promise.resolve(pendingResponse))
        .catch((err) => Promise.reject(err));
