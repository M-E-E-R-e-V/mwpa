import {LangDefine} from 'bambooo';

/**
 * Lang_EN
 */
export class Lang_EN implements LangDefine {

    /**
     * lang content
     * @private
     */
    private _content: {[index: string]: string;} = {
        title: 'MWPA',
        login_title: '<b>MWPA</b>'
    };

    /**
     * getLangCode
     */
    public getLangCode(): string {
        return 'en';
    }

    /**
     * getLangTitle
     */
    public getLangTitle(): string {
        return 'English';
    }

    /**
     * getCountryCode
     */
    public getCountryCode(): string {
        return 'us';
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
        return 'Lang_EN';
    }

}