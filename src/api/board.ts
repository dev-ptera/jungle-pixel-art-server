import { DRAWN_PIXELS } from '../app.config';

export const getJsonBoard = (): string => {
    const data = {};
    for (const key of DRAWN_PIXELS.keys()) {
        data[key] = DRAWN_PIXELS.get(key);
    }
    return JSON.stringify(data);
};

export const getBoard = (res): void => {
    const data = {};
    for (const key of DRAWN_PIXELS.keys()) {
        data[key] = DRAWN_PIXELS.get(key);
    }
    res.send(getJsonBoard());
};
