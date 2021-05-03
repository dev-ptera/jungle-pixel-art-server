import { COST_PER_PIXEL, DRAWN_PIXELS } from '../config';

/** Represent pixel board as an object, [x,y]=>'#color' */
export const getJsonBoard = (): any => {
    const data = {};
    for (const key of DRAWN_PIXELS.keys()) {
        data[key] = DRAWN_PIXELS.get(key);
    }
    return data;
};

/** Send pixel board back to the client as GET request response. */
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
