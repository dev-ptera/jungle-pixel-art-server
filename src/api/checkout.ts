import { convertBananoToRaw } from '../rpc/mrai-to-raw';
import { getAccountInfo } from '../rpc/account-info';
import { getAccountHistory } from '../rpc/account-history';
import { makeKey, sleep } from './util';
import {PAYMENT_ADDRESSES} from "../app.config";
import {PENDING_PAYMENTS} from "../app";

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
const _handleRedrawn = (ws, redrawn: Map<string, string>): void => {
    ws.send(
        JSON.stringify({
            error: 'redraw',
        })
    );
    throw new Error('conflicting pixelboard during checkout');
    ws.close();
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
    throw new Error('payment sets are full');
};

const _getBlockCount = (addr): Promise<number> => {
    return getAccountInfo(addr)
        .then((accountInfo) => Promise.resolve(accountInfo.block_count))
        .catch((err) => {
            console.error(err);
            throw new Error('cannot fetch block');
        });
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

// Listens for receiving payment.
// Every second, check generated receiving address for pending balance.
// If correct amount has been sent, generate receive block to confirm. (This allows for future payments to same address/amount pair).
// Save pixels to database
const _pollForPayment = async (paymentAddr, rawPaymentAmount, minBlock): Promise<void> => {
    let isPaid = false;
    let attempts = 0;
    while (!isPaid) {
        console.log('checking for payment');
        if (++attempts > MAX_ATTEMPTS) {
            console.log('payment timeout');
            throw new Error('payment timeout');
        }
        await sleep(2000);

        await getAccountHistory(paymentAddr, minBlock)
            .then((history) => {
                console.log(history);
                console.log(rawPaymentAmount);
                console.log('\n');

                for (const block of history) {
                    if (block.type === 'receive' && block.amount === rawPaymentAmount) {
                        console.log('discovered block!');
                        isPaid = true;
                        return Promise.resolve();
                    }
                    if (block.block_count <= minBlock) {
                        break;
                    }
                }
            })
            .catch((err) => {
                console.error(err);
                throw new Error('cannot find account history');
            });
    }
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
}

export const checkout = async (ws, msg, board): Promise<void> => {
    let paymentAddr;
    let rawPaymentAmount;
    try {
        const pending = _parseMsg(msg);
        const redrawn = _checkRedrawn(pending, board);
        if (redrawn.size > 0) {
            _handleRedrawn(ws, redrawn);
        }
        rawPaymentAmount = await _convertAmountToRaw(pending.size);
        paymentAddr = _getPaymentAddress(rawPaymentAmount);
        const startBlockCount = await _getBlockCount(paymentAddr);
        _sendPaymentAddress(ws, paymentAddr, rawPaymentAmount);
        await _pollForPayment(paymentAddr, rawPaymentAmount, startBlockCount);
        _saveBoard(ws, pending, board);
        _clearPendingPayment(paymentAddr, rawPaymentAmount);
        return Promise.resolve();
    } catch (err) {
        _clearPendingPayment(paymentAddr, rawPaymentAmount);
        ws.send(
            JSON.stringify({
                error: err.message,
            })
        );
        ws.close();
        return Promise.reject(err);
    }
};
