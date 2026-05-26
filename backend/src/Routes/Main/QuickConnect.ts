import * as crypto from 'crypto';
import {Request, Router} from 'express';
import {DefaultRoute, Logger} from 'figtree';
import {StatusCodes} from 'figtree-schemas';
import {
    MWPASessionUserData,
    QuickConnectGenerateResponse,
    SchemaMWPASessionData,
    SchemaQuickConnectGenerateResponse
} from 'mwpa_schemas';
import {UserQuickConnectToken} from '../../Db/MariaDb/Entities/UserQuickConnectToken.js';
import {UserQuickConnectTokenRepository} from '../../Db/MariaDb/Repositories/UserQuickConnectTokenRepository.js';
import {UserRepository} from '../../Db/MariaDb/Repositories/UserRepository.js';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';

/**
 * Quick Connect — issue an OTP-protected QR payload the mobile app can scan
 * to log in without re-typing credentials.
 *
 * The web client (already authenticated) calls POST /json/quickconnect/generate
 * and shows the response as a QR code. The Flutter app posts the embedded otp
 * back to /mobile/quickconnect to receive a normal mobile session.
 */
export class QuickConnect extends DefaultRoute {

    /**
     * OTP lifetime in seconds. Short on purpose — the QR is only meaningful
     * for the few seconds between display and scan.
     */
    public static readonly TTL_SECONDS = 60;

    public getExpressRouter(): Router {

        this._post(
            '/json/quickconnect/generate',
            checkMWPAUserIsLogin,
            async(req, _res, data): Promise<QuickConnectGenerateResponse> => {
                const sessionUser = data.session?.user as MWPASessionUserData | undefined;

                if (!sessionUser || !sessionUser.isLogin || sessionUser.userid === 0) {
                    return {
                        statusCode: StatusCodes.UNAUTHORIZED,
                        msg: 'Not logged in.'
                    };
                }

                const user = await UserRepository.getInstance().findOne(sessionUser.userid);

                if (user === null) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'User not found.'
                    };
                }

                const nowSec = Math.floor(Date.now() / 1000);
                const expiresAtSec = nowSec + QuickConnect.TTL_SECONDS;

                // Opportunistic cleanup so the table doesn't accumulate dead tokens.
                await UserQuickConnectTokenRepository.getInstance().deleteExpired(nowSec);

                const otp = crypto.randomBytes(24).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

                const row = new UserQuickConnectToken();
                row.user_id = user.id;
                row.token_hash = tokenHash;
                row.expires_at = expiresAtSec;
                row.used_datetime = 0;
                row.create_datetime = nowSec;
                await UserQuickConnectTokenRepository.getInstance().save(row);

                Logger.getLogger().info(`QuickConnect: issued OTP for user ${user.id}`);

                return {
                    statusCode: StatusCodes.OK,
                    msg: '',
                    data: {
                        version: 1,
                        server: QuickConnect.resolvePublicUrl(req),
                        username: user.username,
                        otp: otp,
                        expires_at: expiresAtSec * 1000
                    }
                };
            },
            {
                description: 'Issue a single-use Quick Connect OTP for the logged-in user.',
                responseBodySchema: SchemaQuickConnectGenerateResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

    /**
     * Public base URL of the backend (scheme + host). Relies on Express trust-proxy
     * to honour X-Forwarded-Proto / X-Forwarded-Host — production deployments must
     * therefore set httpserver.proxy.trust in config.json. On localhost (no proxy)
     * the values come straight from the request, which is also correct.
     */
    private static resolvePublicUrl(req: Request): string {
        const host = req.get('host') ?? 'localhost';
        return `${req.protocol}://${host}`;
    }

}