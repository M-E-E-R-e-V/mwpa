import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {Species as SpeciesDB} from '../../inc/Db/MariaDb/Entity/Species';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * SpeciesEntry
 */
export type SpeciesEntry = {
    id: number;
    name: string;
    isdeleted: boolean;
};

/**
 * SpeciesListResponse
 */
export type SpeciesListResponse = DefaultReturn & {
    list: SpeciesEntry[];
};

/**
 * SpeciesMerge
 */
export type SpeciesMerge = {
    source_id: number;
    destination_id: number;
};

/**
 * SpeciesDelete
 */
export type SpeciesDelete = {
    id: number;
};

/**
 * Species
 */
@JsonController()
export class Species {

    /**
     * getList
     * @param session
     */
    @Get('/json/species/list')
    public async getList(@Session() session: any): Promise<SpeciesListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const list: SpeciesEntry[] = [];

            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            const species = await speciesRepository.find();

            for (const specie of species) {
                list.push({
                    id: specie.id,
                    name: specie.name,
                    isdeleted: specie.isdeleted
                });
            }

            return {
                statusCode: StatusCodes.OK,
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED,
            list: []
        };
    }

    /**
     * save
     * @param session
     * @param request
     */
    @Post('/json/species/save')
    public async save(@Session() session: any, @Body() request: SpeciesEntry): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);

            let aspecie: SpeciesDB|null = null;

            if (request.id !== 0) {
                const tspecie = await speciesRepository.findOne({
                    where: {
                        id: request.id
                    }
                });

                if (tspecie) {
                    aspecie = tspecie;
                }
            }

            if (aspecie === null) {
                aspecie = new SpeciesDB();
            }

            aspecie.name = request.name;

            await MariaDbHelper.getConnection().manager.save(aspecie);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * merge
     * @param session
     * @param request
     */
    @Post('/json/species/merge')
    public async merge(@Session() session: any, @Body() request: SpeciesMerge): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            const sightingsRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

            const sourceSpecie = await speciesRepository.findOne({
                id: request.source_id
            });

            if (sourceSpecie) {
                const destinationSpecie = await speciesRepository.findOne({
                    id: request.destination_id
                });

                if (destinationSpecie) {
                    await sightingsRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                        species_id: destinationSpecie.id
                    })
                    .where('species_id = :species_id', {species_id: sourceSpecie.id})
                    .execute();

                    const result = await speciesRepository.delete({
                        id: sourceSpecie.id
                    });

                    if (result) {
                        return {
                            statusCode: StatusCodes.OK
                        };
                    }
                }

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Destination specie not found in the database'
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Source specie not found in the database'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * deleteSpecie
     * @param session
     * @param request
     */
    @Post('/json/species/delete')
    public async deleteSpecie(@Session() session: any, @Body() request: SpeciesDelete): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            const sightingsRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

            const specie = await speciesRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (specie) {
                const countInSightings = await sightingsRepository.count({
                    where: {
                        species_id: specie.id
                    }
                });

                if (countInSightings > 0) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Specie is in use by sightings, pls merge this specie to a other specie'
                    };
                }

                const result = await speciesRepository.delete({
                    id: specie.id
                });

                if (result) {
                    return {
                        statusCode: StatusCodes.OK
                    };
                }
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Specie not found in the database'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}