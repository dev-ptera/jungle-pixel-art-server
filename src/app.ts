import * as express from 'express';
import * as cors from 'cors';
import * as expressWs from 'express-ws';
import { Subject } from 'rxjs';
import { readBoard } from './firestore/firestore';
import { pollService } from './services/poll.service';
import { checkoutService } from './services/checkout.service';
import { IS_PRODUCTION, URL_WHITE_LIST } from './config';
import { getBoard } from './services';

const http = require('http');
const appBase = express();
let wsInstance = expressWs(appBase);
let { app } = wsInstance;

const corsOptions = {
    origin: function (origin, callback) {
        if (IS_PRODUCTION && origin && URL_WHITE_LIST.indexOf(origin) === -1) {
            callback(new Error(`Origin '${origin}' is not allowed by CORS`));
        } else {
            callback(null, true);
        }
    },
};

app.use(cors(corsOptions));
app.get('/board', (req, res) => getBoard(res));
app.ws('/payment', (ws) => {
    const closeSubject = new Subject<number>();

    ws.on('message', async (msg) => {
        await checkoutService(ws, msg, closeSubject).catch(() => {});
    });

    ws.on('close', (status: number) => {
        closeSubject.next(status);
    });
});

const port = process.env.PORT || 3000;
const server = http.createServer(app).listen(port, () => {
    console.log(`Running jungle-pixel-art-server on port ${port}.`);
    console.log(`Production mode enabled? : ${IS_PRODUCTION}`);
    void pollService();
    void readBoard();
});
expressWs(app, server);
