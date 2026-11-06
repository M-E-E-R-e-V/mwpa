import {DBRepository} from '@stefanwerfling/figtree';
import {UserDeviceToken} from '../Entities/UserDeviceToken.js';

/**
 * UserDeviceToken repository
 */
export class UserDeviceTokenRepository extends DBRepository<UserDeviceToken> {

    public static REGISTER_NAME = 'user_device_token';

    public static getInstance(): UserDeviceTokenRepository {
        return super.getSingleInstance(UserDeviceToken);
    }

    /**
     * Token row by hash or null (validity is checked by DeviceTokenPolicy).
     */
    public async findByHash(tokenHash: string): Promise<UserDeviceToken | null> {
        const repository = await this._repository;

        return repository.findOne({
            where: {
                token_hash: tokenHash
            }
        });
    }

    /**
     * Mark the token as used now (moves the idle expiry).
     */
    public async touch(id: number, nowEpochSec: number): Promise<void> {
        const repository = await this._repository;
        await repository
            .createQueryBuilder()
            .update()
            .set({last_used_datetime: nowEpochSec})
            .where('id = :id', {id})
            .execute();
    }

    /**
     * Revoke all valid tokens of a user's device (new Quick Connect of the
     * same device, app logout).
     */
    public async revokeForDevice(userId: number, deviceIdentity: string, nowEpochSec: number): Promise<number> {
        const repository = await this._repository;
        const result = await repository
            .createQueryBuilder()
            .update()
            .set({revoked_datetime: nowEpochSec})
            .where('user_id = :userId AND device_identity = :deviceIdentity AND revoked_datetime = 0', {
                userId,
                deviceIdentity
            })
            .execute();

        return result.affected ?? 0;
    }

    /**
     * Delete revoked tokens and tokens unused since before staleBeforeSec;
     * called opportunistically when a token is issued so the table stays small.
     */
    public async deleteStale(staleBeforeSec: number): Promise<void> {
        const repository = await this._repository;
        await repository
            .createQueryBuilder()
            .delete()
            .where('revoked_datetime > 0 OR last_used_datetime < :stale', {stale: staleBeforeSec})
            .execute();
    }

}
