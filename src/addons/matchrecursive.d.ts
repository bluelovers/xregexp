/*!
 * XRegExp.matchRecursive 4.1.1
 * <xregexp.com>
 * Steven Levithan (c) 2009-present MIT License
 */
import _XRegExp from '../xregexp';
export declare type XRegExpExtend<T extends typeof _XRegExp> = T & {
    matchRecursive(str: string, left: string, right: string, flags?: string, options?): Array<{
        name: string;
        value: string;
        start: number;
        end: number;
    }>;
};
export default function <T extends typeof _XRegExp>(XRegExp: T | XRegExpExtend<T>): XRegExpExtend<T>;
