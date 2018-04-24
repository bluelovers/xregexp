"use strict";
/*!
 * XRegExp Unicode Scripts 4.1.1
 * <xregexp.com>
 * Steven Levithan (c) 2010-present MIT License
 * Unicode data by Mathias Bynens <mathiasbynens.be>
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scripts_1 = require("../../tools/output/scripts");
exports.default = (XRegExp) => {
    /**
     * Adds support for all Unicode scripts. E.g., `\p{Latin}`. Token names are case insensitive,
     * and any spaces, hyphens, and underscores are ignored.
     *
     * Uses Unicode 10.0.0.
     *
     * @requires XRegExp, Unicode Base
     */
    if (!XRegExp.addUnicodeData) {
        throw new ReferenceError('Unicode Base must be loaded before Unicode Scripts');
    }
    XRegExp.addUnicodeData(scripts_1.default);
};
