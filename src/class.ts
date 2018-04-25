/**
 * Created by user on 2018/4/25/025.
 */

import { REGEX_DATA, XRegExp } from './xregexp';

const toString = Object.prototype.toString;

export class XRegExpObject extends RegExp
{
	public [REGEX_DATA]: {
		captureNames: string[],
		source: string,
		flags: string,
	};

	public static isXRegExpObject<T extends XRegExpObject>(value: T): value is T
	public static isXRegExpObject<T extends XRegExpObject>(value): value is T
	public static isXRegExpObject<T extends XRegExpObject>(value: T): value is T
	{
		return XRegExpObject.isRegExp(value) && Object.prototype.hasOwnProperty.call(value, REGEX_DATA);
	}

	public static isRegExp<T extends RegExp>(value: T): value is T
	public static isRegExp<T extends RegExp>(value): value is T
	public static isRegExp<T extends RegExp>(value: T): value is T
	{
		return toString.call(value) === '[object RegExp]';
	}
}

export default XRegExpObject;
