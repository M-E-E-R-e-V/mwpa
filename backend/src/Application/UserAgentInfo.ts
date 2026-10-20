/**
 * Parsed, human-readable bits of a User-Agent string.
 */
export type UserAgentParsed = {
    browser: string;
    os: string;
};

/**
 * Minimal, dependency-free User-Agent parser — extracts a short browser label
 * ("Chrome 140") and OS label ("Windows 10/11") for the Blacklist view. Not a
 * full UA database; covers the common desktop/mobile browsers.
 */
export class UserAgentInfo {

    /**
     * Parse a raw User-Agent into {browser, os}; empty strings when unknown.
     * @param {string} ua
     * @return {UserAgentParsed}
     */
    public static parse(ua: string): UserAgentParsed {
        const value = ua ?? '';

        return {
            browser: UserAgentInfo._browser(value),
            os: UserAgentInfo._os(value)
        };
    }

    /**
     * First capture group of `re` in `ua`, or '' when no match.
     * @param {string} ua
     * @param {RegExp} re
     * @return {string}
     * @protected
     */
    protected static _match(ua: string, re: RegExp): string {
        const result = ua.match(re);

        return result !== null && result[1] !== undefined ? result[1] : '';
    }

    /**
     * Browser name + major version. Order matters: Edge/Opera/Samsung
     * masquerade as Chrome, so they are checked first.
     * @param {string} ua
     * @return {string}
     * @protected
     */
    protected static _browser(ua: string): string {
        const checks: {name: string; re: RegExp;}[] = [
            {name: 'Edge', re: /Edg(?:e|A|iOS)?\/([\d.]+)/u},
            {name: 'Opera', re: /OPR\/([\d.]+)/u},
            {name: 'Samsung Internet', re: /SamsungBrowser\/([\d.]+)/u},
            {name: 'Firefox', re: /Firefox\/([\d.]+)/u},
            {name: 'Chrome', re: /Chrome\/([\d.]+)/u},
            {name: 'Safari', re: /Version\/([\d.]+) .*Safari\//u},
            {name: 'Internet Explorer', re: /(?:MSIE |rv:)([\d.]+)/u}
        ];

        for (const check of checks) {
            const version = UserAgentInfo._match(ua, check.re);

            if (version !== '') {
                const major = version.split('.')[0] ?? '';

                return major === '' ? check.name : `${check.name} ${major}`;
            }
        }

        return '';
    }

    /**
     * Operating-system label.
     * @param {string} ua
     * @return {string}
     * @protected
     */
    protected static _os(ua: string): string {
        if (/Windows NT 10\.0/u.test(ua)) {
            return 'Windows 10/11';
        }

        if (/Windows NT 6\.1/u.test(ua)) {
            return 'Windows 7';
        }

        if (/Windows NT/u.test(ua)) {
            return 'Windows';
        }

        if (/iPhone|iPad|iPod/u.test(ua)) {
            return `iOS ${UserAgentInfo._match(ua, /OS ([\d_]+)/u).replace(/_/gu, '.')}`.trim();
        }

        if (/Mac OS X/u.test(ua)) {
            return `macOS ${UserAgentInfo._match(ua, /Mac OS X ([\d_]+)/u).replace(/_/gu, '.')}`.trim();
        }

        if (/Android/u.test(ua)) {
            return `Android ${UserAgentInfo._match(ua, /Android ([\d.]+)/u)}`.trim();
        }

        if (/Linux/u.test(ua)) {
            return 'Linux';
        }

        return '';
    }

}