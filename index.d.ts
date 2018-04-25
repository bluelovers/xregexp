/**
 * Created by user on 2018/4/25/025.
 */
import _XRegExp from './src/xregexp';
declare const XRegExp: typeof _XRegExp & {
    tag(flags: string): typeof _XRegExp & any;
    build(pattern: string, subs: {
        [key: string]: string | RegExp;
    }, flags: string): typeof _XRegExp & any;
} & {
    matchRecursive(str: string, left: string, right: string, flags?: string, options?: any): {
        name: string;
        value: string;
        start: number;
        end: number;
    }[];
} & {
    addUnicodeData(data: {
        name: string;
        alias?: string;
        bmp?: string;
        isBmpLast?: boolean;
        astral?: string;
        inverseOf?: string;
    }[]): void;
    _getUnicodeProperty(name: string): {
        name: string;
        alias?: string;
        bmp?: string;
        isBmpLast?: boolean;
        astral?: string;
        inverseOf?: string;
    };
} & {
    XRegExp: typeof _XRegExp & {
        tag(flags: string): typeof _XRegExp & any;
        build(pattern: string, subs: {
            [key: string]: string | RegExp;
        }, flags: string): typeof _XRegExp & any;
    } & {
        matchRecursive(str: string, left: string, right: string, flags?: string, options?: any): {
            name: string;
            value: string;
            start: number;
            end: number;
        }[];
    } & {
        addUnicodeData(data: {
            name: string;
            alias?: string;
            bmp?: string;
            isBmpLast?: boolean;
            astral?: string;
            inverseOf?: string;
        }[]): void;
        _getUnicodeProperty(name: string): {
            name: string;
            alias?: string;
            bmp?: string;
            isBmpLast?: boolean;
            astral?: string;
            inverseOf?: string;
        };
    };
} & {
    default: typeof _XRegExp & {
        tag(flags: string): typeof _XRegExp & any;
        build(pattern: string, subs: {
            [key: string]: string | RegExp;
        }, flags: string): typeof _XRegExp & any;
    } & {
        matchRecursive(str: string, left: string, right: string, flags?: string, options?: any): {
            name: string;
            value: string;
            start: number;
            end: number;
        }[];
    } & {
        addUnicodeData(data: {
            name: string;
            alias?: string;
            bmp?: string;
            isBmpLast?: boolean;
            astral?: string;
            inverseOf?: string;
        }[]): void;
        _getUnicodeProperty(name: string): {
            name: string;
            alias?: string;
            bmp?: string;
            isBmpLast?: boolean;
            astral?: string;
            inverseOf?: string;
        };
    } & {
        XRegExp: typeof _XRegExp & {
            tag(flags: string): typeof _XRegExp & any;
            build(pattern: string, subs: {
                [key: string]: string | RegExp;
            }, flags: string): typeof _XRegExp & any;
        } & {
            matchRecursive(str: string, left: string, right: string, flags?: string, options?: any): {
                name: string;
                value: string;
                start: number;
                end: number;
            }[];
        } & {
            addUnicodeData(data: {
                name: string;
                alias?: string;
                bmp?: string;
                isBmpLast?: boolean;
                astral?: string;
                inverseOf?: string;
            }[]): void;
            _getUnicodeProperty(name: string): {
                name: string;
                alias?: string;
                bmp?: string;
                isBmpLast?: boolean;
                astral?: string;
                inverseOf?: string;
            };
        };
    };
};
export = XRegExp;
