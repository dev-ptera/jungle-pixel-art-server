import { NANO_CLIENT } from '../../config';

export const convertBananoToRaw = async (amount: number): Promise<string> =>
    NANO_CLIENT.mrai_to_raw(String(amount))
        .then((data) => {
            return Promise.resolve(data.amount);
        })
        .catch((err) => {
            return Promise.reject(err);
        });
