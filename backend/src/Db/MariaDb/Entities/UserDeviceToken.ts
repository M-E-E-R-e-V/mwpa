import {DBBaseEntityId} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Device token of a mobile device that logged in via Quick Connect: a
 * long-lived secret that replaces the password for later logins of exactly
 * this device (/mobile/login/token). Issued by /mobile/quickconnect, valid
 * until it was not used for DeviceTokenPolicy.IDLE_TTL_SEC, revoked by the
 * app logout or a new Quick Connect of the same device.
 */
@Entity({name: 'user_device_token'})
@Index(['user_id', 'device_identity'])
export class UserDeviceToken extends DBBaseEntityId {

    @Index()
    @Column()
    public user_id!: number;

    /**
     * Devices.identity of the device the token was issued to; a token only
     * works together with this identity.
     */
    @Column({
        type: 'varchar',
        length: 128
    })
    public device_identity!: string;

    /**
     * sha256 hex of the token (64 chars). The plaintext token is only sent
     * once to the app; a leaked dump cannot be replayed.
     */
    @Index({unique: true})
    @Column({
        type: 'varchar',
        length: 64
    })
    public token_hash!: string;

    @Column({
        default: 0
    })
    public create_datetime!: number;

    /**
     * Seconds-epoch of the last successful login with the token; the idle
     * expiry counts from here.
     */
    @Column({
        default: 0
    })
    public last_used_datetime!: number;

    /**
     * Seconds-epoch of the revocation, 0 while valid.
     */
    @Column({
        default: 0
    })
    public revoked_datetime!: number;

}
