import Excel from 'exceljs';
import {DateHelper} from '../../inc/Utils/DateHelper';

/**
 * CalcAutoFill022022
 */
export class CalcAutoFill022022 {

    /**
     * xlsx file
     * @protected
     */
    protected _xlsxFile: string;

    /**
     * new xlsx file
     * @protected
     */
    protected _newXlsxFile: string;

    /**
     * constructor
     * @param axlsxFile
     * @param newXlsxFile
     */
    public constructor(axlsxFile: string, newXlsxFile: string) {
        this._xlsxFile = axlsxFile;
        this._newXlsxFile = newXlsxFile;
    }

    /**
     * calc
     */
    public async calc(): Promise<void> {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(this._xlsxFile);

        const worksheet = workbook.getWorksheet(1);

        for (let index = 2; index < worksheet.rowCount; index++) {
            const beginOfTour = worksheet.getCell(`E${index}`);
            const endOfTour = worksheet.getCell(`F${index}`);
            const sightingDate = worksheet.getCell(`P${index}`);
            const sightingTime = worksheet.getCell(`G${index}`);

            if (sightingDate.value === null) {
                console.log(`Sighting-Date is Empty on Cell: O${index}`);
                continue;
            }

            if (sightingTime.value === null) {
                console.log(`Sighting-Time is Empty on Cell: G${index}`);
                continue;
            }

            if (typeof sightingDate.value !== 'object') {
                console.log(`sightingDate.value not Date on Cell: O${index}`);
            }

            const tDate = sightingDate.value as Date;
            const tTime = sightingTime.value as Date;

            const isDst = DateHelper.isDstObserved(tDate);
            const Wednesday = 3;

            if (beginOfTour.value === null) {
                if (tDate.getDay() === Wednesday) {
                    if ((tTime.getHours() >= 11) && (tTime.getHours() <= 15)) {
                        const newDate = new Date();
                        newDate.setTime(tDate.getTime());
                        newDate.setUTCHours(11, 0);

                        beginOfTour.value = newDate;
                        beginOfTour.numFmt = 'hh:mm';
                    } else {
                        beginOfTour.value = '??';
                    }
                } else if (tTime.getHours() <= 13) {
                    const newDate = new Date();
                    newDate.setTime(tDate.getTime());
                    newDate.setUTCHours(9, 30);

                    beginOfTour.value = newDate;
                    beginOfTour.numFmt = 'hh:mm';
                } else if (isDst) {
                    if ((tTime.getHours() > 15) || ((tTime.getHours() === 15) && (tTime.getMinutes() >= 30))) {
                        const newDate = new Date();
                        newDate.setTime(tDate.getTime());
                        newDate.setUTCHours(15, 30);

                        beginOfTour.value = newDate;
                        beginOfTour.numFmt = 'hh:mm';
                    }
                } else if (tTime.getHours() >= 15) {
                    const newDate = new Date();
                    newDate.setTime(tDate.getTime());
                    newDate.setUTCHours(15, 0);

                    beginOfTour.value = newDate;
                    beginOfTour.numFmt = 'hh:mm';
                }
            }

            if (endOfTour.value === null) {
                if (tDate.getDay() === Wednesday) {
                    if ((tTime.getHours() >= 11) && (tTime.getHours() <= 15)) {
                        const newDate = new Date();
                        newDate.setTime(tDate.getTime());
                        newDate.setUTCHours(15, 0);

                        endOfTour.value = newDate;
                        endOfTour.numFmt = 'hh:mm';
                    } else {
                        endOfTour.value = '??';
                    }
                } else if (tTime.getHours() <= 13) {
                    const newDate = new Date();
                    newDate.setTime(tDate.getTime());
                    newDate.setUTCHours(13, 0);

                    endOfTour.value = newDate;
                    endOfTour.numFmt = 'hh:mm';
                } else if (isDst) {
                    if ((tTime.getHours() > 15) || ((tTime.getHours() === 15) && (tTime.getMinutes() >= 30))) {
                        const newDate = new Date();
                        newDate.setTime(tDate.getTime());
                        newDate.setUTCHours(19, 0);

                        endOfTour.value = newDate;
                        endOfTour.numFmt = 'hh:mm';
                    }
                } else if (tTime.getHours() >= 15) {
                    const newDate = new Date();
                    newDate.setTime(tDate.getTime());
                    newDate.setUTCHours(18, 30);

                    endOfTour.value = newDate;
                    endOfTour.numFmt = 'hh:mm';
                }
            }
        }

        // workbook.removeWorksheetEx(worksheet);

        await workbook.xlsx.writeFile(this._newXlsxFile);
    }

}