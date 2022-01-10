import {readXlsxFile} from 'read-excel-file/node';

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
     * @param xlsxFile
     */
    public constructor(xlsxFile: string) {
        this._xlsxFile = xlsxFile;
    }

    /**
     * import
     */
    public async import(): Promise<boolean> {
        const rows = await readXlsxFile(this._xlsxFile);

        for (const row of rows) {

        }

        return true;
    }

}