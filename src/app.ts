import * as express from 'express';
import * as cors from 'cors';
import * as expressWs from 'express-ws';


import { isProduction, URL_WHITE_LIST } from './app.config';

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

const send = (res, noCacheMethod: () => Promise<any>, cache): void => {
    cache
        ? res.send(JSON.stringify(cache))
        : noCacheMethod()
              .then((fresh) => res.send(JSON.stringify(fresh)))
              .catch((err) => res.status(500).send(JSON.stringify(err)));
};


const drawnPixels = new Map<string, string>();
drawnPixels.set('1,1', '');

app.use(cors(corsOptions));
app.ws('/payment', (ws, req) => {
    ws.on('message', msg => {
        const pending = new Map<string, string>();
        const redrawn = new Map<string, string>();

        for (const entry of JSON.parse(msg)) {
            const split = entry.split(',');
            const key = `${split[0]},${split[1]}`;
            if (drawnPixels.has(key)) {
                redrawn.set(key, drawnPixels.get(key));
            }
            pending.set(key, split[2]);
        }

        // TODO: Send back pixels to erase.
        if (redrawn.size > 0) {
            ws.send(JSON.stringify({
                error: 'redraw'
            }));
            return;
        }

        setTimeout(() => {
            ws.send(JSON.stringify({
                address: 'ban_1ra4zw8f31soe4caz31cnq99nodbr65ke8yqoqhy8mf65ywakikri19ndj1m'
            }))
        }, 1500)
    })

    ws.on('close', () => {
        console.log('WebSocket was closed')
    })
})

const port = process.env.PORT || 3000;
const server = http.createServer(app).listen(port, () => {
    console.log(`Running jungle-pixel-art-server on port ${port}.`);
    console.log(`Production mode enabled? : ${isProduction()}`);
});
expressWs(app, server)

