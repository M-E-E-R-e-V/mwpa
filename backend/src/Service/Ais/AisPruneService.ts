import {Logger, ServiceJobAbstract} from 'figtree';
import {LiveAisTrackRepository} from '../../Db/MariaDb/Repositories/LiveAisTrackRepository.js';
import {AisSettings} from './AisSettings.js';

/**
 * Once-daily cron that deletes live AIS pings older than the
 * configured retention window (default 90 days). Keeps the hot
 * buffer table bounded so even an idle subscription doesn't grow
 * forever.
 *
 * Runs decoupled from LiveAisService so it survives a WebSocket
 * outage — if the live ingest is down for a week, the prune still
 * fires and the table doesn't start growing past the retention
 * threshold once the stream comes back.
 */
export class AisPruneService extends ServiceJobAbstract {

    public static readonly NAME = 'ais-prune';

    public constructor() {
        super(AisPruneService.NAME, ['mariadb']);
        // Daily at 03:15 local — outside any reasonable cron-clash
        // window with the other services (Weather/Ocean/Fishing all
        // run on */5 or */15 marks, External-Tour on `0 * * * *`).
        this._cron = '15 3 * * *';
    }

    protected async _execute(): Promise<void> {
        const config = await AisSettings.load();
        const cutoffSec = Math.floor(Date.now() / 1000) - (config.live_retention_days * 86400);

        const deleted = await LiveAisTrackRepository.getInstance().pruneOlderThan(cutoffSec);

        Logger.getLogger().info(
            `AisPruneService: deleted ${deleted} live_ais_track rows older than `
            + `${new Date(cutoffSec * 1000).toISOString()} (retention=${config.live_retention_days}d)`
        );
    }

}