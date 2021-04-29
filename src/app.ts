import * as express from 'express';
import * as cors from 'cors';
import * as expressWs from 'express-ws';
import { isProduction, URL_WHITE_LIST } from './app.config';
import { checkout } from './api/checkout';
import {initPendingPaymentSets, makeKey} from './api/util';

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
export const PENDING_PAYMENTS = initPendingPaymentSets();

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
    ws.on('message', async (msg) => {
        await checkout(ws, msg, drawnPixels).catch((err) => {
            console.error(err);
        });
    });

    ws.on('close', () => {
        console.log('WebSocket was closed');
    });
});



const port = process.env.PORT || 3000;
const server = http.createServer(app).listen(port, () => {
    console.log(`Running jungle-pixel-art-server on port ${port}.`);
    console.log(`Production mode enabled? : ${isProduction()}`);
});
expressWs(app, server);
