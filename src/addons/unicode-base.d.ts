/*!
 * XRegExp Unicode Base 4.1.1
 * <xregexp.com>
 * Steven Levithan (c) 2008-present MIT License
 */
import _XRegExp from '../xregexp';
export declare type XRegExpUnicodeData = {
    name: string;
    alias?: string;
    bmp?: string;
    isBmpLast?: boolean;
    astral?: string;
    inverseOf?: string;
};
export declare type XRegExpExtend<T extends typeof _XRegExp> = T & {
    addUnicodeData(data: XRegExpUnicodeData[]): void;
    _getUnicodeProperty(name: string): XRegExpUnicodeData;
};
export default function <T extends typeof _XRegExp>(XRegExp: T | XRegExpExtend<T>): XRegExpExtend<T>;
