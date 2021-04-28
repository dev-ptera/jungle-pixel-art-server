import { NanoClient } from '@dev-ptera/nano-node-rpc';

const args = process.argv.slice(2);

export const isProduction = (): boolean => args && args[0] === 'production';
export const URL_WHITE_LIST = ['https://jungle-pixel-art.web.app'];
export const RPC_SERVER_PROD_URL = 'http://108.39.249.5:1120/banano-rpc';
export const RPC_SERVER_DEV_URL = 'http://localhost:1119/banano-rpc';
export const nanoClient = new NanoClient({ url: isProduction() ? RPC_SERVER_PROD_URL : RPC_SERVER_DEV_URL });
