import xlsx from 'node-xlsx';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
import {Species as SpeciesDB} from '../../inc/Db/MariaDb/Entity/Species';
import {Vehicle as VehicleDB} from '../../inc/Db/MariaDb/Entity/Vehicle';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {NameCorection} from '../../inc/Utils/NameCorection';

/**
 * Im2020KeyValueObject
 */
interface Im2020KeyValueObject {
    [key: string]: string;
}

/**
 * Im2020
 * Import file 2020 is a prepared file with fixed columns. The import can only be carried out once with this file.
 */
export class Im2020 {

    /**
     * xlsx file
     * @protected
     */
    protected _xlsxFile: string;

    /**
     * constructor
     * @param axlsxFile
     */
    public constructor(axlsxFile: string) {
        this._xlsxFile = axlsxFile;
    }

    /**
     * import
     */
    public async import(): Promise<boolean> {
        const workSheets = xlsx.parse(this._xlsxFile);

        if (!workSheets) {
            return false;
        }

        if (workSheets.length === 0) {
            return false;
        }

        const sheet0 = workSheets[0];

        if (!sheet0 || !sheet0.data) {
            return false;
        }

        const rows = sheet0.data;

        let colums: string[] | null = null;

        for (const row of rows) {
            const rowData: any[] = row as any[];

            if (!colums) {
                colums = rowData;
                continue;
            }

            const rowObj: Im2020KeyValueObject = {};

            for (let i = 0; i < rowData.length; i++) {
                const columName = colums[i];
                const columValue = rowData[i];

                rowObj[columName] = columValue;
            }

            await this._importRow(rowObj);
        }

        return true;
    }

    /**
     * _importRow
     * @param row
     * @protected
     */
    protected async _importRow(row: Im2020KeyValueObject): Promise<void> {
        // organization ------------------------------------------------------------------------------------------------
        const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);
        let organization = await organizationRepository.findOne({
            where: {
                id: 1
            }
        });

        if (!organization) {
            const newOrganization = new OrganizationDB();
            newOrganization.description = 'Rename me';

            organization = await MariaDbHelper.getConnection().manager.save(newOrganization);
        }

        // species -----------------------------------------------------------------------------------------------------
        const speciesName = NameCorection.renameUpperChars(row.SPECIES);
        let speciesId = 0;

        if (speciesName) {
            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            let speciesData = await speciesRepository.findOne({
                where: {
                    name: speciesName
                }
            });

            if (!speciesData) {
                const newSpecies = new SpeciesDB();
                newSpecies.name = speciesName;
                speciesData = await MariaDbHelper.getConnection().manager.save(newSpecies);
            }

            speciesId = speciesData.id;
        }

        // vehicle -----------------------------------------------------------------------------------------------------
        const vehicleName = NameCorection.renameUpperChars(row.Boat);
        let vehicleId = 0;

        if (vehicleName) {
            const vehicleRepository = MariaDbHelper.getConnection().getRepository(VehicleDB);
            let vehicleData = await vehicleRepository.findOne({
                where: {
                    organization_id: organization.id,
                    description: vehicleName
                }
            });

            if (!vehicleData) {
                const newVehicle = new VehicleDB();
                newVehicle.organization_id = organization.id;
                newVehicle.description = vehicleName;

                vehicleData = await MariaDbHelper.getConnection().manager.save(newVehicle);
            }

            vehicleId = vehicleData.id;
        }

        console.log(row);
        console.log(speciesId);
        console.log(vehicleId);
    }

}