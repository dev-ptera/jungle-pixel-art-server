import { serviceAccount } from './serviceAccountKey';
import { DRAWN_PIXELS } from '../config';
const admin = require('firebase-admin');
const BOARD_NAME = 'board2021';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export const writeTx = async (txHash: string, pixels: Map<string, string>) => {
    const docRef = db.collection(BOARD_NAME).doc(txHash);
    const collection = {};
    const pixelCollectionObj = {};
    for (const key of pixels.keys()) {
        pixelCollectionObj[key] = pixels.get(key);
    }
    collection['date'] = new Date().toLocaleDateString();
    collection['time'] = new Date().toLocaleTimeString();
    collection['timestamp'] = new Date().toISOString();
    collection['size'] = pixels.size;
    collection['pixels'] = pixelCollectionObj;

    await docRef.set(collection);
};

export const readBoard = async (): Promise<void> => {
    const snapshot = await db.collection(BOARD_NAME).get();
    snapshot.forEach((doc) => {
        const pixelObj = doc.data().pixels;
        for (const [key, value] of Object.entries(pixelObj)) {
            DRAWN_PIXELS.set(key, value as string);
        }
    });
    return;
};
