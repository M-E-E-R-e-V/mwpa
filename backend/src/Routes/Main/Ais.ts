import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    AisLiveListResponse,
    AisVesselTrackResponse,
    SchemaAisLiveListRequest,
    SchemaAisLiveListResponse,
    SchemaAisVesselTrackRequest,
    SchemaAisVesselTrackResponse,
    SchemaMWPASessionData,
    RightAis,
} from 'mwpa_schemas';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {LiveList} from './Ais/LiveList.js';
import {VesselTrack} from './Ais/VesselTrack.js';

/**
 * AIS routes. Read-only for now — admins can edit the AIS config
 * via the Settings endpoint in a follow-up.
 */
export class Ais extends DefaultRoute {

    public getExpressRouter(): Router {

        this._post(
            '/json/ais/live/list',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<AisLiveListResponse> => {
                return LiveList.getList(data.body ?? {});
            },
            {
                aclRight: RightAis.ais_read,
                description: 'Latest AIS ping per MMSI inside the live buffer.'
                    + ' Optional bbox + max_age_seconds (default 3600) filters.'
                    + ' Joined with the static AisVessel metadata for name/flag/ship_type.',
                bodySchema: SchemaAisLiveListRequest,
                responseBodySchema: SchemaAisLiveListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/ais/vessel/track',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<AisVesselTrackResponse> => {
                const req = data.body!;
                return VesselTrack.getTrack(req.mmsi, req.since_seconds);
            },
            {
                aclRight: RightAis.ais_read,
                description: 'Chronological positions for one MMSI from the live buffer.'
                    + ' Default since_seconds=3600. Used by the live-map trail-on-click overlay.',
                bodySchema: SchemaAisVesselTrackRequest,
                responseBodySchema: SchemaAisVesselTrackResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}