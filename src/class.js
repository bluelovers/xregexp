"use strict";
/**
 * Created by user on 2018/4/25/025.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const xregexp_1 = require("./xregexp");
const toString = Object.prototype.toString;
class XRegExpObject extends RegExp {
    static isXRegExpObject(value) {
        return XRegExpObject.isRegExp(value) && Object.prototype.hasOwnProperty.call(value, xregexp_1.REGEX_DATA);
    }
    static isRegExp(value) {
        return toString.call(value) === '[object RegExp]';
    }
}
exports.XRegExpObject = XRegExpObject;
exports.default = XRegExpObject;
