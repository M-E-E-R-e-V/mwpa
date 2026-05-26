import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Quick Connect OTP issued by /json/quickconnect/generate.
 * Short-lived (~60s) and single-use: the first /mobile/quickconnect call
 * consumes it by setting used_datetime.
 */
@Entity({name: 'user_quick_connect_token'})
export class UserQuickConnectToken extends DBBaseEntityId {

    @Index()
    @Column()
    public user_id!: number;

    /**
     * sha256 hex of the OTP (64 chars). The plaintext OTP only travels in the
     * QR payload; the DB stores the hash so a leaked dump cannot replay it.
     */
    @Index({unique: true})
    @Column({
        type: 'varchar',
        length: 64
    })
    public token_hash!: string;

    /**
     * Expiry as seconds since unix epoch. INT is fine until 2038 and matches
     * the rest of the schema (create_datetime/update_datetime).
     */
    @Index()
    @Column({
        default: 0
    })
    public expires_at!: number;

    /**
     * Seconds-epoch when the token was consumed by /mobile/quickconnect, or 0
     * if still unused.
     */
    @Column({
        default: 0
    })
    public used_datetime!: number;

    @Column({
        default: 0
    })
    public create_datetime!: number;

}