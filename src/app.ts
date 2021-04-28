import * as express from 'express';
import * as cors from 'cors';
import { isProduction, URL_WHITE_LIST } from './app.config';

const http = require('http');
const app = express();
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

app.use(cors(corsOptions));
app.post('/payment', (req, res) => {
    setTimeout(() => {
        res.send({
            address: 'ban_1ra4zw8f31soe4caz31cnq99nodbr65ke8yqoqhy8mf65ywakikri19ndj1m'
        });
    }, 1500);
});

const port = process.env.PORT || 3000;
http.createServer(app).listen(port, () => {
    console.log(`Running jungle-pixel-art-server on port ${port}.`);
    console.log(`Production mode enabled? : ${isProduction()}`);
});
