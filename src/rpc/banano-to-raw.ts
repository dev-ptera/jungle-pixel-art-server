import { nanoClient } from '../app.config';

export const convertBananoToRaw = async (amount: string): Promise<number> => nanoClient.mrai_to_raw(amount);
