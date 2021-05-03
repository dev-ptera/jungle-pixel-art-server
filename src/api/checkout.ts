import { convertBananoToRaw } from '../rpc/mrai-to-raw';
import { makeKey } from './util';
import { COST_PER_PIXEL, DRAWN_PIXELS, PAYMENT_ADDRESSES, PENDING_PAYMENTS, TIMEOUT_MS } from '../app.config';
import { Observable, Subject, Subscription } from 'rxjs';
import { newBlocksSubject } from './poll';
import { CONFLICTING_PIXEL_BOARD, PAYMENT_SETS_FULL, PAYMENT_TIMEOUT } from '../error';
import { first } from 'rxjs/operators';
import { getJsonBoard } from './board';
import { writeTx } from '../firestore/firestore';
const WebSocket = require('ws');

const SUCCESS_STATUS = 1000;
const ERROR_STATUS = 1011;
const CLIENT_CLOSED_BROWSER = 1001;
const CLIENT_CLOSED_PAYMENT_WINDOW = 4580;
const TIMEOUT_STATUS = 4581;

type Tx = {
    paymentAddress: string;
    rawPaymentAmount: string;
    listeners: Subscription[];
};

// Convert the user edits into a map which we can save.
const _parseMsg = (msg: string): Map<string, string> => {
    const pending = new Map<string, string>();
    for (const entry of JSON.parse(msg)) {
        const [x, y, color] = entry.split(',');
        const key = makeKey(x, y);
        pending.set(key, color);
    }
    return pending;
};

// Check to see if the board has any conflicting edits.
const _checkRedrawn = (pending: Map<string, string>): Map<string, string> => {
    const redrawn = new Map<string, string>();
    for (const key of pending.keys()) {
        if (DRAWN_PIXELS.has(key)) {
            redrawn.set(key, DRAWN_PIXELS.get(key));
        }
    }
    return redrawn;
};

// Called if there are conflicting edits.
const _handleRedrawn = (redrawn: Map<string, string>): void => {
    // NEED TO SEND BACK PIXELS BACK TO ERASE
    throw new Error(CONFLICTING_PIXEL_BOARD);
};

const _convertAmountToRaw = (amount): Promise<string> => {
    return convertBananoToRaw(amount)
        .then((raw) => Promise.resolve(raw))
        .catch((err) => {
            console.error(err);
            throw new Error('raw conversion error');
        });
};

const _getPaymentAddress = (amount: string): string => {
    for (const addr of PAYMENT_ADDRESSES) {
        if (!PENDING_PAYMENTS[addr].has(amount)) {
            PENDING_PAYMENTS[addr].add(amount);
            return addr;
        }
    }
    throw new Error(PAYMENT_SETS_FULL);
};

const _sendPaymentAddress = (ws, addr: string, raw, cost: number): void => {
    ws.send(
        JSON.stringify({
            address: addr,
            raw,
            cost,
            timeout: TIMEOUT_MS,
        })
    );
};

const _listenForIncomingBlocks = (tx: Tx): Observable<string> => {
    const paymentAddr = tx.paymentAddress;
    const rawPaymentAmount = tx.rawPaymentAmount;
    return new Observable((event) => {
        tx.listeners.push(
            newBlocksSubject.subscribe((history) => {
                if (history.account === paymentAddr) {
                    for (const block of history.history) {
                        if (block.type === 'receive' && block.amount === rawPaymentAmount) {
                            console.log(`[INFO]: Payment received! ${paymentAddr} ${rawPaymentAmount} ${block.hash}`);
                            _clearPendingPayment(tx);
                            event.next(block.hash);
                            break;
                        }
                    }
                }
            })
        );
    });
};

const _saveBoard = async (ws, hash: string, pending: Map<string, string>): Promise<any> => {
    await writeTx(hash, pending);
    for (const key of pending.keys()) {
        DRAWN_PIXELS.set(key, pending.get(key));
    }
    ws.send(
        JSON.stringify({
            success: true,
            board: getJsonBoard(),
        })
    );
    return Promise.resolve();
};

const _clearTxListeners = (tx: Tx): void => {
    for (const sub of tx.listeners) {
        if (!sub.closed) {
            sub.unsubscribe();
        }
    }
};

const _clearPendingPayment = (tx: Tx): void => {
    const paymentAddr = tx.paymentAddress;
    const rawPaymentAmount = tx.rawPaymentAmount;
    if (PENDING_PAYMENTS[paymentAddr] && PENDING_PAYMENTS[paymentAddr].has(rawPaymentAmount)) {
        PENDING_PAYMENTS[paymentAddr].delete(rawPaymentAmount);
    }
};

const _handleErr = (ws: WebSocket, err: Error, status: number): Promise<void> => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                error: err.message,
            })
        );
        ws.close(status);
    }
    return Promise.reject(err);
};

const _listenForWebsocketClose = (tx: Tx, closeSubject: Subject<number>) => {
    closeSubject.pipe(first()).subscribe((status) => {
        if (status === CLIENT_CLOSED_PAYMENT_WINDOW) {
            console.log(
                `[INFO]: Web socket closed by the client [PAYMENT_WINDOW]; canceling transaction for address ${tx.paymentAddress}.`
            );
        }
        if (status === CLIENT_CLOSED_BROWSER) {
            console.log(
                `[INFO]: Web socket closed by the client [CLOSED_BROWSER]; canceling transaction for address ${tx.paymentAddress}.`
            );
        }
        if (status === SUCCESS_STATUS) {
            console.log(
                `[INFO]: Web socket closed with SUCCESS by the server; transaction complete for address ${tx.paymentAddress}.`
            );
        }
        if (status === ERROR_STATUS) {
            console.log(
                `[INFO]: Web socket closed with ERROR by the server; transaction canceled for address ${tx.paymentAddress}.`
            );
        }
        if (status === TIMEOUT_STATUS) {
            console.log(
                `[INFO]: Web socket closed with ERROR by the server; transaction timeout for address ${tx.paymentAddress}.`
            );
        }
        _clearPendingPayment(tx);
        _clearTxListeners(tx);
    });
};

export const checkout = async (ws: WebSocket, msg, closeSubject): Promise<void> => {
    const tx: Tx = {
        paymentAddress: undefined,
        rawPaymentAmount: undefined,
        listeners: [closeSubject],
    };
    return new Promise(async (resolve, reject) => {
        try {
            /* Listen for WebSocket closing. If client terminates connection, we end the pending transaction. */
            _listenForWebsocketClose(tx, closeSubject);

            /* Parse user-provided pixel map. */
            const pending = _parseMsg(msg);

            /* If the board has any conflicting pixels, send back an error. */
            const redrawn = _checkRedrawn(pending);
            if (redrawn.size > 0) {
                _handleRedrawn(redrawn);
            }

            /* Get payment amount and payment address */
            const cost = Math.ceil(pending.size * COST_PER_PIXEL);
            tx.rawPaymentAmount = await _convertAmountToRaw(cost);
            tx.paymentAddress = _getPaymentAddress(tx.rawPaymentAmount);

            /* Send payment address back to the client. */
            _sendPaymentAddress(ws, tx.paymentAddress, tx.rawPaymentAmount, cost);

            /* Listen for payment timeouts. */
            setTimeout(() => {
                const err = new Error(PAYMENT_TIMEOUT);
                _handleErr(ws, err, TIMEOUT_STATUS).catch(reject);
            }, TIMEOUT_MS);

            /* Listen for payment, then save the board and send updated board back to client. */
            tx.listeners.push(
                _listenForIncomingBlocks(tx).subscribe(async (hash: string) => {
                    await _saveBoard(ws, hash, pending);
                    ws.close(SUCCESS_STATUS);
                    return resolve();
                })
            );
        } catch (err) {
            _handleErr(ws, err, ERROR_STATUS).catch(reject);
        }
    });
};
