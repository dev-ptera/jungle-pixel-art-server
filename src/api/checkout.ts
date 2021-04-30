import { convertBananoToRaw } from '../rpc/mrai-to-raw';
import { makeKey } from './util';
import { PAYMENT_ADDRESSES, PENDING_PAYMENTS } from '../app.config';
import { Observable, Subscription } from 'rxjs';
import { newBlocksSubject } from './poll';
import { CONFLICTING_PIXEL_BOARD, PAYMENT_SETS_FULL } from '../error';
import { first } from 'rxjs/operators';

const MAX_ATTEMPTS = 60; // TODO: timeout request
const SUCCESS_STATUS = 1000;
const ERROR_STATUS = 1011;
const CLIENT_CLOSED_PAYMENT_WINDOW = 4580;
const CLIENT_CLOSED_BROWSER = 1001;

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
const _checkRedrawn = (pending: Map<string, string>, board: Map<string, string>): Map<string, string> => {
    const redrawn = new Map<string, string>();
    for (const key of pending.keys()) {
        if (board.has(key)) {
            redrawn.set(key, board.get(key));
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

const _sendPaymentAddress = (ws, addr, amount): void => {
    ws.send(
        JSON.stringify({
            address: addr,
            raw: amount,
        })
    );
};

const _listenForIncomingBlocks = (paymentAddr, rawPaymentAmount, subs: Subscription[]): Observable<any> => {
    return new Observable((event) => {
        subs.push(
            newBlocksSubject.subscribe((history) => {
                if (history.account === paymentAddr) {
                    for (const block of history.history) {
                        if (block.type === 'receive' && block.amount === rawPaymentAmount) {
                            console.log(`[INFO]: Payment received! ${paymentAddr} ${rawPaymentAmount} ${block.height}`);
                            event.next();
                            break;
                        }
                    }
                }
            })
        );
    });
};

const _saveBoard = (ws, pending: Map<string, string>, board): void => {
    for (const key of pending.keys()) {
        board.set(key, pending.get(key));
    }
    ws.send(
        JSON.stringify({
            success: true,
        })
    );
};

const _clearPendingPayment = (addr: string, rawAmount: string, subscriptions: Subscription[]): void => {
    if (PENDING_PAYMENTS[addr] && PENDING_PAYMENTS[addr].has(rawAmount)) {
        PENDING_PAYMENTS[addr].delete(rawAmount);
    }
    for (const sub of subscriptions) {
        if (!sub.closed) {
            sub.unsubscribe();
        }
    }
};

export const checkout = async (ws: WebSocket, msg, board, closeSubject): Promise<void> => {
    let paymentAddr;
    let rawPaymentAmount;
    let txListeners: Subscription[] = [closeSubject];

    try {
        /* Listen for WebSocket closing. If client terminates connection, we end the pending transaction. */
        closeSubject.pipe(first()).subscribe((status) => {
            if (status === CLIENT_CLOSED_PAYMENT_WINDOW) {
                console.log(
                    `[INFO]: Web socket closed by the client [PAYMENT_WINDOW]; canceling transaction for address ${paymentAddr}.`
                );
            }
            if (status === CLIENT_CLOSED_BROWSER) {
                console.log(
                    `[INFO]: Web socket closed by the client [CLOSED_BROWSER]; canceling transaction for address ${paymentAddr}.`
                );
            }
            if (status === SUCCESS_STATUS) {
                console.log(
                    `[INFO]: Web socket closed with SUCCESS by the server; transaction complete for address ${paymentAddr}.`
                );
            }
            if (status === ERROR_STATUS) {
                console.log(
                    `[INFO]: Web socket closed with ERROR by the server; transaction canceled for address ${paymentAddr}.`
                );
            }
            _clearPendingPayment(paymentAddr, rawPaymentAmount, txListeners);
        });

        /* Parse user-provided pixel map. */
        const pending = _parseMsg(msg);

        /* If the board has any conflicting pixels, send back an error. */
        const redrawn = _checkRedrawn(pending, board);
        if (redrawn.size > 0) {
            _handleRedrawn(redrawn);
        }

        /* Get payment amount and payment address */
        rawPaymentAmount = await _convertAmountToRaw(pending.size);
        paymentAddr = _getPaymentAddress(rawPaymentAmount);

        /* Send payment address back to the client. */
        _sendPaymentAddress(ws, paymentAddr, rawPaymentAmount);

        /* Listen for payment, then save the board and send updated board back to client. */
        txListeners.push(
            _listenForIncomingBlocks(paymentAddr, rawPaymentAmount, txListeners).subscribe(() => {
                _saveBoard(ws, pending, board);
                ws.close(SUCCESS_STATUS);
                return Promise.resolve();
            })
        );
    } catch (err) {
        ws.send(
            JSON.stringify({
                error: err.message,
            })
        );
        ws.close(ERROR_STATUS);
        return Promise.reject(err);
    }
};
