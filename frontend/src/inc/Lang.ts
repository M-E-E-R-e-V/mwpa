import {Lang as BamboooLang, LangDefine} from 'bambooo';
import {Lang_DE} from '../langs/Lang_DE';
import {Lang_EN} from '../langs/Lang_EN';
import {Lang_ES} from '../langs/Lang_ES';

/**
 * Lang
 *
 * Thin facade over the bambooo v2 `Lang` so the whole app shares ONE language
 * state. Previously this was a separate translation system: `LangTextV2` widgets
 * used bambooo's `Lang` (switched by the navbar flag), while `Lang.i().l(...)`
 * calls used this class — which the flag never switched, so those strings stayed
 * in the default language. Delegating here means the navbar language switch (and
 * the persisted selection applied on load) drives both.
 */
export class Lang {

    /**
     * init — register the MWPA language packs in the shared bambooo store.
     */
    public static init(): void {
        BamboooLang.init([new Lang_EN(), new Lang_DE(), new Lang_ES()]);
    }

    /**
     * setStoreLangSelect
     * @param {string} lang
     */
    public static setStoreLangSelect(lang: string): void {
        BamboooLang.setStoreLangSelect(lang);
    }

    /**
     * getStoreLangSelect
     * @returns {string|null}
     */
    public static getStoreLangSelect(): string|null {
        return BamboooLang.getStoreLangSelect();
    }

    /**
     * addStore
     * @param {LangDefine} alang
     */
    public static addStore(alang: LangDefine): void {
        BamboooLang.addStore(alang);
    }

    /**
     * i — return the shared bambooo language instance.
     * @param {string|null} langPack
     * @returns {BamboooLang}
     */
    public static i(langPack: string|null = null): BamboooLang {
        return BamboooLang.i(langPack);
    }

}

// Populate the shared store early (idempotent; the PageLoader also inits it).
Lang.init();