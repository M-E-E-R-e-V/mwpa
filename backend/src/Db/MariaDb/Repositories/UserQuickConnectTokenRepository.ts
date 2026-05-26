import {DBRepository} from 'figtree';
import {UserQuickConnectToken} from '../Entities/UserQuickConnectToken.js';

/**
 * UserQuickConnectToken repository
 */
export class UserQuickConnectTokenRepository extends DBRepository<UserQuickConnectToken> {

    public static REGISTER_NAME = 'user_quick_connect_token';

    public static getInstance(): UserQuickConnectTokenRepository {
        return super.getSingleInstance(UserQuickConnectToken);
    }

    /**
     * Lookup an unused token by hash. Returns null if missing, already used,
     * or expired - callers should treat any of those cases as "invalid OTP".
     */
    public async findUnusedByHash(tokenHash: string, nowEpochSec: number): Promise<UserQuickConnectToken | null> {
        const repository = await this._repository;
        const row = await repository.findOne({
            where: {
                token_hash: tokenHash
            }
        });

        if (row === null) {
            return null;
        }

        if (row.used_datetime > 0) {
            return null;
        }

        if (row.expires_at <= nowEpochSec) {
            return null;
        }

        return row;
    }

    /**
     * Mark the token as consumed. Returns true if exactly one row was updated -
     * the caller should treat false as a race (another login already used it).
     */
    public async markUsed(id: number, nowEpochSec: number): Promise<boolean> {
        const repository = await this._repository;
        const result = await repository
            .createQueryBuilder()
            .update()
            .set({used_datetime: nowEpochSec})
            .where('id = :id AND used_datetime = 0', {id})
            .execute();

        return (result.affected ?? 0) === 1;
    }

    /**
     * Delete tokens whose absolute expiry is older than nowEpochSec.
     * Called opportunistically from the generate endpoint so the table stays small.
     */
    public async deleteExpired(nowEpochSec: number): Promise<void> {
        const repository = await this._repository;
        await repository
            .createQueryBuilder()
            .delete()
            .where('expires_at <= :now', {now: nowEpochSec})
            .execute();
    }

}