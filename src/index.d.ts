import _XRegExp from './xregexp';
import XRegExpObject from './class';
export declare const XRegExp: typeof _XRegExp & {
    tag(flags: string): XRegExpObject;
    build(pattern: string, subs: {
        [key: string]: string | RegExp;
    }, flags: string): XRegExpObject;
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
export default XRegExp;
