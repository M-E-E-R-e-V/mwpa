import {LangDefine} from 'bambooo';
import {Lang_DE} from '../langs/Lang_DE';
import {Lang_EN} from '../langs/Lang_EN';

/**
 * Lang
 */
export class Lang {

    private static _store: {[index: string]: LangDefine;} = {};

    // eslint-disable-next-line no-use-before-define
    private static _instance: Lang | null = null;

    private _defaultLang: LangDefine;
    private _lang: LangDefine;

    /**
     * init
     */
    public static init(): void {
        Lang.addStore(new Lang_EN());
        Lang.addStore(new Lang_DE());
    }

    /**
     * setStoreLangSelect
     * @param lang
     */
    public static setStoreLangSelect(lang: string): void {
        localStorage.setItem('nwpa_lang', lang);
    }

    /**
     * getStoreLangSelect
     */
    public static getStoreLangSelect(): string|null {
        return localStorage.getItem('nwpa_lang');
    }

    /**
     * addStore
     * @param alang
     */
    public static addStore(alang: LangDefine): void {
        Lang._store[alang.getClassName()] = alang;
    }

    /**
     * i
     * @param langPack
     */
    public static i(langPack: string | null = null): Lang {
        if (Lang._instance) {
            return Lang._instance;
        }

        let lp = langPack;

        if (!lp) {
            lp = 'Lang_EN';
        }

        Lang._instance = new Lang(lp);

        return Lang._instance;
    }

    /**
     * constructor
     * @param langPack
     * @param defaultLangPack
     */
    public constructor(langPack: string, defaultLangPack = 'Lang_EN') {
        this._defaultLang = Lang._store[defaultLangPack];
        this._lang = Lang._store[langPack];
    }

    /**
     * setCurrentLang
     * @param alang
     */
    public setCurrentLang(alang: LangDefine): void {
        this._lang = alang;
    }

    /**
     * l
     * @param content
     */
    public l(content: string): string {
        let rcontent: string | null = null;

        if (this._lang) {
            rcontent = this._lang.l(content);
        }

        if (!rcontent) {
            rcontent = this._defaultLang.l(content);
        }

        if (rcontent) {
            return rcontent;
        }

        return content;
    }

    /**
     * lAll
     */
    public lAll(): void {
        jQuery('body').find('[lang="1"]').each((_index, element) => {
            const attrLangValue = jQuery(element).attr('lang-value');

            if (attrLangValue) {
                jQuery(element).empty().append(this.l(attrLangValue));
            }
        });
    }

}

// init
Lang.init();