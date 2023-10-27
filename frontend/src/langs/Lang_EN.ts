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
        login_title: '<b>MWPA</b>',
        copyrightname: '<strong>Mammal watching. Processing. Analysing. - Project MWPA 2022 <a href="https://github.com/stefanwerfling/mwpa" target="_blank">on Github</a>.</strong> &nbsp; A project of the  <a href="https://m-e-e-r.de/" target="_blank">M.e.e.r e.V.</a> association',
        version: '<b>Version</b> 1.0.0'
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