import { COST_PER_PIXEL, DRAWN_PIXELS } from '../app.config';

export const getJsonBoard = (): any => {
    const data = {};
    for (const key of DRAWN_PIXELS.keys()) {
        data[key] = DRAWN_PIXELS.get(key);
    }
    return data;
};

export const getBoard = (res): void => {
    const data = {};
    for (const key of DRAWN_PIXELS.keys()) {
        data[key] = DRAWN_PIXELS.get(key);
    }
    res.send({
        pixels: getJsonBoard(),
        costPerPixel: COST_PER_PIXEL,
    });
};
