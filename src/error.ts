const formatError = (err) => `[ERR]: ${err}`;

export const LOG = (message, raw) => {
    console.error(message);
    console.error(raw);
};
export const BLOCK_COUNT_ERROR = (addr) => formatError(`Unable to fetch block_count for address ${addr}.`);
export const ACCOUNT_HISTORY_ERROR = (addr, block) =>
    formatError(`Unable to fetch the reversed account_history for address ${addr} starting at block ${block}.`);
export const PAYMENT_SETS_FULL = 'The payments sets are full.  Unable to handle incoming purchase, please try again later.';
export const PAYMENT_TIMEOUT = 'The payment request has timed out.  Please close this window and try again.';
export const CONFLICTING_PIXEL_BOARD = 'Someone overwrote your pixels.  The affected pixels have been overwritten.  Please close this window.';
