/** Wait interval in milliseconds. */
export const sleep = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

/** This is used to create our pixel map objects, where the x and y coordinates make the key.  */
export const makeKey = (x: number, y: number) => `${x},${y}`;

/** This might be refactored in the future, but each payment address has a corresponding set of payment transactions.  */
export const initPendingPaymentSets = (paymentAddrs: string[]): Array<Set<string>> => {
    const pendingPayments: Array<Set<string>> = [];
    for (const paymentAddr of paymentAddrs) {
        pendingPayments[paymentAddr] = new Set<string>();
    }
    return pendingPayments;
};
