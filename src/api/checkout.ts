import { convertBananoToRaw } from '../rpc/mrai-to-raw';
import { makeKey } from './util';
import { PAYMENT_ADDRESSES, PENDING_PAYMENTS } from '../app.config';
import { Observable } from 'rxjs';
import { newBlocksSubject } from './poll';
import { CONFLICTING_PIXEL_BOARD, PAYMENT_SETS_FULL } from '../error';

const MAX_ATTEMPTS = 60;

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

// Return payment addr blockcount when begin request payment.
const _sendPaymentAddress = (ws, addr, amount): void => {
    ws.send(
        JSON.stringify({
            address: addr,
            raw: amount,
        })
    );
};

const _listenForIncomingBlocks = (paymentAddr, rawPaymentAmount): Observable<void> => {
    return new Observable((event) => {
        const subject = newBlocksSubject.subscribe((history) => {
            if (history.account === paymentAddr) {
                for (const block of history.history) {
                    if (block.type === 'receive' && block.amount === rawPaymentAmount) {
                        console.log(`[INFO]: Payment received! ${paymentAddr} ${rawPaymentAmount} ${block.height}`);
                        event.next();
                        subject.unsubscribe();
                        break;
                    }
                }
            }
        });
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

const _clearPendingPayment = (addr: string, rawAmount: string): void => {
    if (PENDING_PAYMENTS[addr] && PENDING_PAYMENTS[addr].has(rawAmount)) {
        PENDING_PAYMENTS[addr].delete(rawAmount);
    }
};

export const checkout = async (ws, msg, board, closeSubject): Promise<void> => {
    let paymentAddr;
    let rawPaymentAmount;
    let paymentSubscription;

    try {
        closeSubject.subscribe(() => {
            console.log('[INFO]: Web socket closed, canceling transaction.');
            closeSubject.unsubscribe();
            _clearPendingPayment(paymentAddr, rawPaymentAmount);
        });

        const pending = _parseMsg(msg);
        const redrawn = _checkRedrawn(pending, board);
        if (redrawn.size > 0) {
            _handleRedrawn(redrawn);
        }
        rawPaymentAmount = await _convertAmountToRaw(pending.size);
        paymentAddr = _getPaymentAddress(rawPaymentAmount);
        _sendPaymentAddress(ws, paymentAddr, rawPaymentAmount);
        paymentSubscription = _listenForIncomingBlocks(paymentAddr, rawPaymentAmount).subscribe(() => {
            _saveBoard(ws, pending, board);
            _clearPendingPayment(paymentAddr, rawPaymentAmount);
            paymentSubscription.unsubscribe();
            return Promise.resolve();
        });
    } catch (err) {
        _clearPendingPayment(paymentAddr, rawPaymentAmount);
        if (paymentSubscription) {
            paymentSubscription.unsubscribe();
        }
        ws.send(
            JSON.stringify({
                error: err.message,
            })
        );
        ws.close();
        return Promise.reject(err);
    }
};
