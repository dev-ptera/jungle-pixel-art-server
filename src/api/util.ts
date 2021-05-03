export const sleep = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

export const makeKey = (x: number, y: number) => `${x},${y}`;

export const initPendingPaymentSets = (paymentAddrs: string[]): Array<Set<string>> => {
    const pendingPayments: Array<Set<string>> = [];
    for (const paymentAddr of paymentAddrs) {
        pendingPayments[paymentAddr] = new Set<string>();
    }
    return pendingPayments;
};
