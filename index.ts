/**
 * Created by user on 2018/4/25/025.
 */

import _XRegExp from './src/xregexp';
import XRegExpObject from './src/class';

import _XRegExp2 from './src';

const _XRegExp3 = _XRegExp2 as typeof _XRegExp2 & {
	XRegExp: typeof _XRegExp2,
};
const XRegExp = _XRegExp3 as typeof _XRegExp3 & {
	default: typeof _XRegExp3,
};

XRegExp.XRegExp = XRegExp;
XRegExp.default = XRegExp;

export = XRegExp;
