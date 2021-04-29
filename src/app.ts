import * as express from 'express';
import * as cors from 'cors';
import * as expressWs from 'express-ws';
import { isProduction, URL_WHITE_LIST } from './app.config';
import { checkout } from './api/checkout';
import { makeKey } from './api/util';
import { poll } from './api/poll';
import {Subject} from "rxjs";

const http = require('http');
const appBase = express();
let wsInstance = expressWs(appBase);
let { app } = wsInstance; // let app = wsInstance.app;

const corsOptions = {
    origin: function (origin, callback) {
        if (isProduction() && origin && URL_WHITE_LIST.indexOf(origin) === -1) {
            callback(new Error(`Origin '${origin}' is not allowed by CORS`));
        } else {
            callback(null, true);
        }
    },
};

const drawnPixels = new Map<string, string>();

drawnPixels.set(makeKey(115, 451), '#259a36');
drawnPixels.set(makeKey(145, 463), '#259a36');

app.use(cors(corsOptions));
app.get('/board', (req, res) => {
    const data = {};
    for (const key of drawnPixels.keys()) {
        data[key] = drawnPixels.get(key);
    }
    res.send(JSON.stringify(data));
});

app.ws('/payment', (ws) => {

    const closeSubject = new Subject<void>();

    ws.on('message', async (msg) => {
        await checkout(ws, msg, drawnPixels, closeSubject).catch((err) => {
            console.error(err);
        });
    });

    ws.on('close', () => {
        console.log('WebSocket was closed');
        closeSubject.next();
    });
});

const port = process.env.PORT || 3000;
const server = http.createServer(app).listen(port, () => {
    console.log(`Running jungle-pixel-art-server on port ${port}.`);
    console.log(`Production mode enabled? : ${isProduction()}`);
    poll();
});
expressWs(app, server);

/*
On app load, continuously poll receiving addresses if there are any pending payments in the payment pending buckets
addr1 = each 1 second
addr2 = each 2 seconds
addr3 = each 5 seconds

getAccountHistory = RPC command used to poll
batman is configured to confirm receiving blocks immediately for all 3 addresses

Each poll requires current block height per address.

This block height can be calculated on app load, on success, and on error.
This can be saved as a constant, next to the pendingPayments array<sets>

 */
