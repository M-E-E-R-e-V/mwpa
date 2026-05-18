import {DBRepository} from 'figtree';
import {In} from 'typeorm';
import {AisVessel} from '../Entities/AisVessel.js';

/**
 * Insert-or-update patch for static AIS vessel metadata. All fields
 * except `mmsi` are optional — the upsert only overwrites fields
 * that come in non-empty, so a static-data message that updates only
 * the callsign doesn't blank out a previously-captured name.
 */
export type AisVesselUpsertPatch = {
    mmsi: string;
    imo?: string;
    name?: string;
    callsign?: string;
    ship_type?: number | null;
    flag?: string;
    length_m?: number | null;
    beam_m?: number | null;
};

export class AisVesselRepository extends DBRepository<AisVessel> {

    public static REGISTER_NAME = 'ais_vessel';

    public static getInstance(): AisVesselRepository {
        return super.getSingleInstance(AisVessel);
    }

    public async findByMmsi(mmsi: string): Promise<AisVessel | null> {
        const repo = await this._repository;
        return repo.findOne({where: {mmsi}});
    }

    public async findManyByMmsi(mmsis: string[]): Promise<AisVessel[]> {
        if (mmsis.length === 0) {
            return [];
        }
        const repo = await this._repository;
        return repo.find({where: {mmsi: In(mmsis)}});
    }

    /**
     * Upsert by MMSI. Non-empty fields overwrite; empty / undefined
     * fields are preserved from the existing row — so a partial
     * static message doesn't wipe data captured earlier.
     */
    public async upsertByMmsi(patch: AisVesselUpsertPatch, nowUnixSec: number): Promise<void> {
        const repo = await this._repository;
        let row = await repo.findOne({where: {mmsi: patch.mmsi}});

        if (!row) {
            row = repo.create({mmsi: patch.mmsi});
        }

        if (patch.imo !== undefined && patch.imo !== '') {
            row.imo = patch.imo;
        }
        if (patch.name !== undefined && patch.name !== '') {
            row.name = patch.name;
        }
        if (patch.callsign !== undefined && patch.callsign !== '') {
            row.callsign = patch.callsign;
        }
        if (patch.ship_type !== undefined && patch.ship_type !== null) {
            row.ship_type = patch.ship_type;
        }
        if (patch.flag !== undefined && patch.flag !== '') {
            row.flag = patch.flag;
        }
        if (patch.length_m !== undefined && patch.length_m !== null) {
            row.length_m = patch.length_m;
        }
        if (patch.beam_m !== undefined && patch.beam_m !== null) {
            row.beam_m = patch.beam_m;
        }

        row.last_updated_at = nowUnixSec;
        await repo.save(row);
    }

}