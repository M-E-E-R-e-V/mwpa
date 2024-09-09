/**
 * UnauthorizedError
 */
export class UnauthorizedError extends Error {

    /**
     * constructor
     * @param message
     */
    public constructor(message?: string) {
        let msg = '';

        if (message) {
            msg = message;
        }

        super(msg);
    }

}