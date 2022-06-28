import {NetFetch} from '../Net/NetFetch';

/**
 * SpeciesEntry
 */
export type SpeciesEntry = {
    id: number;
    name: string;
};

/**
 * SpeciesListResponse
 */
export type SpeciesListResponse = {
    status: string;
    error?: string;
    list: SpeciesEntry[];
};

/**
 * Species
 */
export class Species {

    /**
     * getList
     */
    public static async getList(): Promise<null|SpeciesEntry[]> {
        const result = await NetFetch.getData('/json/species/list');

        if (result) {
            const response = result as SpeciesListResponse;

            if (response.status === 'ok') {
                return response.list;
            }
        }

        return null;
    }

}