import { NanoClient } from '@dev-ptera/nano-node-rpc';
import { initPendingPaymentSets, makeKey } from './api/util';

const args = process.argv.slice(2);

export const isProduction = (): boolean => args && args[0] === 'production';
export const URL_WHITE_LIST = [
    'https://jungle-pixel-art.web.app',
    'http://localhost:8080',
    'https://junglepixelart.com',
];
export const RPC_SERVER_PROD_URL = 'http://108.39.249.5:1120/banano-rpc';
export const RPC_SERVER_DEV_URL = 'http://localhost:1119/banano-rpc';
export const nanoClient = new NanoClient({ url: isProduction() ? RPC_SERVER_PROD_URL : RPC_SERVER_DEV_URL });
export const PAYMENT_ADDRESSES = [
    'ban_1ifabmn4heheu1jr6mffaosqazr7cgfi7bcfwk8ahb9f3di4qhie45fz4rea',
    'ban_1h73pziojtds9yqj1c4ja853r8zmpee9sh4uhw6u69qnpdmpbbhmgy1xs7ob',
    'ban_1y13ox5cekr3phidh8463thu8p3ii6gh17zph8hf1ssdynmssxpu7emxpekw',
];

export const PENDING_PAYMENTS = initPendingPaymentSets();
export const DRAWN_PIXELS = new Map<string, string>();
export const TIMEOUT_MS = 1000 * 60;
