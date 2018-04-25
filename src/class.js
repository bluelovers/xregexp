"use strict";
/**
 * Created by user on 2018/4/25/025.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("./core");
const fixed_1 = require("./fixed");
const toString = Object.prototype.toString;
class XRegExpObject extends RegExp {
    static isXRegExpObject(value) {
        return XRegExpObject.isRegExp(value) && Object.prototype.hasOwnProperty.call(value, core_1.REGEX_DATA);
    }
    static isRegExp(value) {
        return toString.call(value) === '[object RegExp]';
    }
    static escape(str) {
        return fixed_1.nativ.replace.call(core_1.toObject(str), /[-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
}
exports.XRegExpObject = XRegExpObject;
exports.default = XRegExpObject;
