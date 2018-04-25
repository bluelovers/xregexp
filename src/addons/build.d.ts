/*!
 * XRegExp.build 4.1.1
 * <xregexp.com>
 * Steven Levithan (c) 2012-present MIT License
 */
import _XRegExp from '../xregexp';
import XRegExpObject from '../class';
export declare type XRegExpBuildSub = {
    [key: string]: string | RegExp;
};
export declare type XRegExpExtend<T extends typeof _XRegExp> = T & {
    tag(flags: string): XRegExpObject;
    build(pattern: string, subs: XRegExpBuildSub, flags: string): XRegExpObject;
};
export default function <T extends typeof _XRegExp = typeof _XRegExp>(XRegExp: T | XRegExpExtend<T>): XRegExpExtend<T>;
