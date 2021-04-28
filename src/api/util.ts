export const sleep = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

export const makeKey = (x: number, y: number) => `${x},${y}`;
