/**
 * Created by user on 2018/4/25/025.
 */

import { REGEX_DATA, toObject, XRegExp } from './core';
import { nativ } from './fixed';

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

	static escape(str: string)
	{
		return nativ.replace.call(toObject(str), /[-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
	}
}

export default XRegExpObject;
