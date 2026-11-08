import {Backend} from './Application/Backend.js';

/**
 * Main application
 */
(async(): Promise<void> => {
    const backend = new Backend();
    await backend.start();
})();
