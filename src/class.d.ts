/**
 * Created by user on 2018/4/25/025.
 */
import { REGEX_DATA } from './core';
export declare class XRegExpObject extends RegExp {
    [REGEX_DATA]: {
        captureNames: string[];
        source: string;
        flags: string;
    };
    static isXRegExpObject<T extends XRegExpObject>(value: T): value is T;
    static isXRegExpObject<T extends XRegExpObject>(value: any): value is T;
    static isRegExp<T extends RegExp>(value: T): value is T;
    static isRegExp<T extends RegExp>(value: any): value is T;
}
export default XRegExpObject;
