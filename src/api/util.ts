import {PAYMENT_ADDRESSES} from "../app.config";

export const sleep = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

export const makeKey = (x: number, y: number) => `${x},${y}`;

export const initPendingPaymentSets = (): Array<Set<string>> => {
    const pendingPayments: Array<Set<string>> = [];
    for (const paymentAddr of PAYMENT_ADDRESSES) {
        pendingPayments[paymentAddr] = new Set<string>();
    }
    return pendingPayments;
}
