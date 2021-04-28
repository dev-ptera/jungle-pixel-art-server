import { nanoClient } from '../app.config';

export const convertBananoToRaw = async (amount: number): Promise<string> =>
    nanoClient
        .mrai_to_raw(String(amount))
        .then((data) => {
            return Promise.resolve(data.amount);
        })
        .catch((err) => {
            return Promise.reject(err);
        });
