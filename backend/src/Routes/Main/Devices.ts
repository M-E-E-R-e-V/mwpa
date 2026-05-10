import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {StatusCodes} from 'figtree-schemas';
import {In} from 'typeorm';
import {
    DevicesEntry,
    DevicesListResponse,
    RightUsers,
    SchemaDevicesListResponse,
    SchemaMWPASessionData
} from 'mwpa_schemas';
import {DevicesRepository} from '../../Db/MariaDb/Repositories/DevicesRepository.js';
import {GroupRepository} from '../../Db/MariaDb/Repositories/GroupRepository.js';
import {OrganizationRepository} from '../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {SightingRepository} from '../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {UserRepository} from '../../Db/MariaDb/Repositories/UserRepository.js';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';

/**
 * Devices admin route. Lists every device row enriched with the bound user,
 * the user's organization (via main_groupid → Group), per-device counts of
 * sightings + tours, and the most recent sighting timestamp.
 *
 * One handler — three repository round-trips total (devices, users, groups +
 * orgs in parallel) plus two grouped aggregates over sighting/sighting_tour.
 */
export class Devices extends DefaultRoute {

    public getExpressRouter(): Router {

        this._post(
            '/json/devices/list',
            checkMWPAUserIsLoginACL,
            async(): Promise<DevicesListResponse> => {
                const deviceRepo = await DevicesRepository.getInstance().getRepository();
                const devices = await deviceRepo.find({order: {update_datetime: 'DESC'}});

                if (devices.length === 0) {
                    return {statusCode: StatusCodes.OK, list: []};
                }

                const userIds = [...new Set(devices.map((d) => d.user_id).filter((id) => id > 0))];
                const deviceIds = devices.map((d) => d.id);

                const userRepo = await UserRepository.getInstance().getRepository();
                const sightingRepo = await SightingRepository.getInstance().getRepository();
                const tourRepo = await SightingTourRepository.getInstance().getRepository();

                const [users, sightingAggs, tourAggs] = await Promise.all([
                    userIds.length === 0 ? Promise.resolve([]) : userRepo.find({where: {id: In(userIds)}}),
                    sightingRepo.createQueryBuilder('s')
                    .select('s.device_id', 'device_id')
                    .addSelect('COUNT(*)', 'count')
                    .addSelect('MAX(s.create_datetime)', 'last_create')
                    .where('s.device_id IN (:...ids)', {ids: deviceIds})
                    .groupBy('s.device_id')
                    .getRawMany<{device_id: number; count: string; last_create: string;}>(),
                    tourRepo.createQueryBuilder('t')
                    .select('t.device_id', 'device_id')
                    .addSelect('COUNT(*)', 'count')
                    .where('t.device_id IN (:...ids)', {ids: deviceIds})
                    .groupBy('t.device_id')
                    .getRawMany<{device_id: number; count: string;}>()
                ]);

                const groupIds = [...new Set(users.map((u) => u.main_groupid).filter((id) => id > 0))];
                const groupRepo = await GroupRepository.getInstance().getRepository();
                const groups = groupIds.length === 0 ? [] : await groupRepo.find({where: {id: In(groupIds)}});

                const orgIds = [...new Set(groups.map((g) => g.organization_id).filter((id) => id > 0))];
                const orgRepo = await OrganizationRepository.getInstance().getRepository();
                const orgs = orgIds.length === 0 ? [] : await orgRepo.find({where: {id: In(orgIds)}});

                // index for O(1) lookup
                const userById = new Map(users.map((u) => [u.id, u]));
                const groupById = new Map(groups.map((g) => [g.id, g]));
                const orgById = new Map(orgs.map((o) => [o.id, o]));
                const sightingByDevice = new Map(sightingAggs.map((a) => [a.device_id, a]));
                const tourByDevice = new Map(tourAggs.map((a) => [a.device_id, a]));

                const list: DevicesEntry[] = devices.map((d) => {
                    const user = userById.get(d.user_id);
                    const group = user ? groupById.get(user.main_groupid) : undefined;
                    const org = group ? orgById.get(group.organization_id) : undefined;

                    const sAgg = sightingByDevice.get(d.id);
                    const tAgg = tourByDevice.get(d.id);

                    return {
                        id: d.id,
                        identity: d.identity,
                        description: d.description,
                        user_id: d.user_id,
                        user_name: user?.full_name !== '' && user?.full_name !== undefined ? user.full_name : user?.username ?? '',
                        user_email: user?.email ?? '',
                        organization_id: org?.id ?? 0,
                        organization_name: org?.description ?? '',
                        create_datetime: d.create_datetime,
                        update_datetime: d.update_datetime,
                        sighting_count: sAgg ? parseInt(sAgg.count, 10) : 0,
                        tour_count: tAgg ? parseInt(tAgg.count, 10) : 0,
                        last_sighting_datetime: sAgg ? parseInt(sAgg.last_create, 10) : 0
                    };
                });

                return {statusCode: StatusCodes.OK, list: list};
            },
            {
                description: 'List all mobile devices with bound user, organization and activity counts.',
                aclRight: RightUsers.users_read,
                responseBodySchema: SchemaDevicesListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}