import {LangDefine} from '../inc/Bambooo/Lang/LangDefine';

/**
 * Lang_DE
 */
export class Lang_DE implements LangDefine {

    /**
     * lang content
     * @private
     */
    private _content: {[index: string]: string;} = {
        title: 'MWPA',
        login_title: '<b>MWPA</b>',
        'Sighting': 'Sichtung',
        'Tours': 'Touren',
        'Species': 'Spezies',
        'Add sighting': 'Sichtung hinzufügen',
        'Add new sighting': 'Neue Sichtung hinzufügen',
        'Date': 'Datum',
        'Vehicle': 'Fahrzeug',
        'Driver': 'Fahrer',
        'Group-Size': 'Gruppengröße',
        'Time begin': 'Zeit begin',
        'Time end': 'Zeit Ende',
        'Duration': 'Dauer',
        'Location': 'Ort',
        'Encounter': 'Begegnen',
        'Other species': 'Andere Spezies'
    };

    /**
     * getLangCode
     */
    public getLangCode(): string {
        return 'de';
    }

    /**
     * getLangTitle
     */
    public getLangTitle(): string {
        return 'Deutsch';
    }

    /**
     * getCountryCode
     */
    public getCountryCode(): string {
        return 'de';
    }

    /**
     * l
     * @param acontent
     */
    public l(acontent: string): string | null {
        if (this._content[acontent]) {
            return this._content[acontent];
        }

        return null;
    }

    /**
     * getClassName
     */
    public getClassName(): string {
        return 'Lang_DE';
    }

}