"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("./core");
const xregexp_1 = require("./xregexp");
const core_2 = require("./core");
/**
 * Created by user on 2018/4/25/025.
 */
// Native methods to use and restore ('native' is an ES3 reserved keyword)
exports.nativ = {
    exec: RegExp.prototype.exec,
    test: RegExp.prototype.test,
    match: String.prototype.match,
    replace: String.prototype.replace,
    split: String.prototype.split
};
// Storage for fixed/extended native methods
// ==--------------------------==
// Fixed/extended native methods
// ==--------------------------==
var fixed;
(function (fixed) {
    /**
     * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
     * bugs in the native `RegExp.prototype.exec`. Use via `XRegExp.exec`.
     *
     * @memberOf RegExp
     * @param {String} str String to search.
     * @returns {Array} Match array with named backreference properties, or `null`.
     */
    fixed.exec = function (str) {
        const origLastIndex = this.lastIndex;
        const match = exports.nativ.exec.apply(this, arguments);
        if (match) {
            // Fix browsers whose `exec` methods don't return `undefined` for nonparticipating capturing
            // groups. This fixes IE 5.5-8, but not IE 9's quirks mode or emulation of older IEs. IE 9
            // in standards mode follows the spec.
            if (!core_1.correctExecNpcg && match.length > 1 && match.includes('')) {
                const r2 = core_1.copyRegex(this, {
                    removeG: true,
                    isInternalOnly: true
                });
                // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
                // matching due to characters outside the match
                exports.nativ.replace.call(String(str).slice(match.index), r2, (...args) => {
                    const len = args.length;
                    // Skip index 0 and the last 2
                    for (let i = 1; i < len - 2; ++i) {
                        if (args[i] === undefined) {
                            match[i] = undefined;
                        }
                    }
                });
            }
            // Attach named capture properties
            let groupsObject = match;
            if (xregexp_1.default.isInstalled('namespacing')) {
                // https://tc39.github.io/proposal-regexp-named-groups/#sec-regexpbuiltinexec
                match.groups = Object.create(null);
                groupsObject = match.groups;
            }
            if (this[core_2.REGEX_DATA] && this[core_2.REGEX_DATA].captureNames) {
                // Skip index 0
                for (let i = 1; i < match.length; ++i) {
                    const name = this[core_2.REGEX_DATA].captureNames[i - 1];
                    if (name) {
                        groupsObject[name] = match[i];
                    }
                }
            }
            // Fix browsers that increment `lastIndex` after zero-length matches
            if (this.global && !match[0].length && (this.lastIndex > match.index)) {
                this.lastIndex = match.index;
            }
        }
        if (!this.global) {
            // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
            this.lastIndex = origLastIndex;
        }
        return match;
    };
    /**
     * Fixes browser bugs in the native `RegExp.prototype.test`.
     *
     * @memberOf RegExp
     * @param {String} str String to search.
     * @returns {Boolean} Whether the regex matched the provided value.
     */
    fixed.test = function (str) {
        // Do this the easy way :-)
        return !!fixed.exec.call(this, str);
    };
    /**
     * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
     * bugs in the native `String.prototype.match`.
     *
     * @memberOf String
     * @param {RegExp|*} regex Regex to search with. If not a regex object, it is passed to `RegExp`.
     * @returns {Array} If `regex` uses flag g, an array of match strings or `null`. Without flag g,
     *   the result of calling `regex.exec(this)`.
     */
    fixed.match = function (regex) {
        if (!xregexp_1.default.isRegExp(regex)) {
            // Use the native `RegExp` rather than `XRegExp`
            regex = new RegExp(regex);
        }
        else if (regex.global) {
            const result = exports.nativ.match.apply(this, arguments);
            // Fixes IE bug
            regex.lastIndex = 0;
            return result;
        }
        return fixed.exec.call(regex, core_2.toObject(this));
    };
    /**
     * Adds support for `${n}` (or `$<n>`) tokens for named and numbered backreferences in replacement
     * text, and provides named backreferences to replacement functions as `arguments[0].name`. Also
     * fixes browser bugs in replacement text syntax when performing a replacement using a nonregex
     * search value, and the value of a replacement regex's `lastIndex` property during replacement
     * iterations and upon completion. Note that this doesn't support SpiderMonkey's proprietary third
     * (`flags`) argument. Use via `XRegExp.replace`.
     *
     * @memberOf String
     * @param {RegExp|String} search Search pattern to be replaced.
     * @param {String|Function} replacement Replacement string or a function invoked to create it.
     * @returns {String} New string with one or all matches replaced.
     */
    fixed.replace = function (search, replacement) {
        const isRegex = xregexp_1.default.isRegExp(search);
        let origLastIndex;
        let captureNames;
        let result;
        if (isRegex) {
            if (search[core_2.REGEX_DATA]) {
                ({ captureNames } = search[core_2.REGEX_DATA]);
            }
            // Only needed if `search` is nonglobal
            origLastIndex = search.lastIndex;
        }
        else {
            search += ''; // Type-convert
        }
        // Don't use `typeof`; some older browsers return 'function' for regex objects
        if (core_1.isType(replacement, 'Function')) {
            // Stringifying `this` fixes a bug in IE < 9 where the last argument in replacement
            // functions isn't type-converted to a string
            result = exports.nativ.replace.call(String(this), search, (...args) => {
                if (captureNames) {
                    let groupsObject;
                    if (xregexp_1.default.isInstalled('namespacing')) {
                        // https://tc39.github.io/proposal-regexp-named-groups/#sec-regexpbuiltinexec
                        groupsObject = Object.create(null);
                        args.push(groupsObject);
                    }
                    else {
                        // Change the `args[0]` string primitive to a `String` object that can store
                        // properties. This really does need to use `String` as a constructor
                        args[0] = new String(args[0]);
                        [groupsObject] = args;
                    }
                    // Store named backreferences
                    for (let i = 0; i < captureNames.length; ++i) {
                        if (captureNames[i]) {
                            groupsObject[captureNames[i]] = args[i + 1];
                        }
                    }
                }
                // Update `lastIndex` before calling `replacement`. Fixes IE, Chrome, Firefox, Safari
                // bug (last tested IE 9, Chrome 17, Firefox 11, Safari 5.1)
                if (isRegex && search.global) {
                    search.lastIndex = args[args.length - 2] + args[0].length;
                }
                // ES6 specs the context for replacement functions as `undefined`
                return replacement(...args);
            });
        }
        else {
            // Ensure that the last value of `args` will be a string when given nonstring `this`,
            // while still throwing on null or undefined context
            result = exports.nativ.replace.call(this == null ? this : String(this), search, (...args) => {
                return exports.nativ.replace.call(String(replacement), core_2.replacementToken, replacer);
                function replacer($0, bracketed, angled, dollarToken) {
                    bracketed = bracketed || angled;
                    // Named or numbered backreference with curly or angled braces
                    if (bracketed) {
                        // XRegExp behavior for `${n}` or `$<n>`:
                        // 1. Backreference to numbered capture, if `n` is an integer. Use `0` for the
                        //    entire match. Any number of leading zeros may be used.
                        // 2. Backreference to named capture `n`, if it exists and is not an integer
                        //    overridden by numbered capture. In practice, this does not overlap with
                        //    numbered capture since XRegExp does not allow named capture to use a bare
                        //    integer as the name.
                        // 3. If the name or number does not refer to an existing capturing group, it's
                        //    an error.
                        let n = +bracketed; // Type-convert; drop leading zeros
                        if (n <= args.length - 3) {
                            return args[n] || '';
                        }
                        // Groups with the same name is an error, else would need `lastIndexOf`
                        n = captureNames ? captureNames.indexOf(bracketed) : -1;
                        if (n < 0) {
                            throw new SyntaxError(`Backreference to undefined group ${$0}`);
                        }
                        return args[n + 1] || '';
                    }
                    // Else, special variable or numbered backreference without curly braces
                    if (dollarToken === '$') { // $$
                        return '$';
                    }
                    if (dollarToken === '&' || +dollarToken === 0) { // $&, $0 (not followed by 1-9), $00
                        return args[0];
                    }
                    if (dollarToken === '`') { // $` (left context)
                        return args[args.length - 1].slice(0, args[args.length - 2]);
                    }
                    if (dollarToken === "'") { // $' (right context)
                        return args[args.length - 1].slice(args[args.length - 2] + args[0].length);
                    }
                    // Else, numbered backreference without braces
                    dollarToken = +dollarToken; // Type-convert; drop leading zero
                    // XRegExp behavior for `$n` and `$nn`:
                    // - Backrefs end after 1 or 2 digits. Use `${..}` or `$<..>` for more digits.
                    // - `$1` is an error if no capturing groups.
                    // - `$10` is an error if less than 10 capturing groups. Use `${1}0` or `$<1>0`
                    //   instead.
                    // - `$01` is `$1` if at least one capturing group, else it's an error.
                    // - `$0` (not followed by 1-9) and `$00` are the entire match.
                    // Native behavior, for comparison:
                    // - Backrefs end after 1 or 2 digits. Cannot reference capturing group 100+.
                    // - `$1` is a literal `$1` if no capturing groups.
                    // - `$10` is `$1` followed by a literal `0` if less than 10 capturing groups.
                    // - `$01` is `$1` if at least one capturing group, else it's a literal `$01`.
                    // - `$0` is a literal `$0`.
                    if (!isNaN(dollarToken)) {
                        if (dollarToken > args.length - 3) {
                            throw new SyntaxError(`Backreference to undefined group ${$0}`);
                        }
                        return args[dollarToken] || '';
                    }
                    // `$` followed by an unsupported char is an error, unlike native JS
                    throw new SyntaxError(`Invalid token ${$0}`);
                }
            });
        }
        if (isRegex) {
            if (search.global) {
                // Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
                search.lastIndex = 0;
            }
            else {
                // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
                search.lastIndex = origLastIndex;
            }
        }
        return result;
    };
    /**
     * Fixes browser bugs in the native `String.prototype.split`. Use via `XRegExp.split`.
     *
     * @memberOf String
     * @param {RegExp|String} separator Regex or string to use for separating the string.
     * @param {Number} [limit] Maximum number of items to include in the result array.
     * @returns {Array} Array of substrings.
     */
    fixed.split = function (separator, limit) {
        if (!xregexp_1.default.isRegExp(separator)) {
            // Browsers handle nonregex split correctly, so use the faster native method
            return exports.nativ.split.apply(this, arguments);
        }
        const str = String(this);
        const output = [];
        const origLastIndex = separator.lastIndex;
        let lastLastIndex = 0;
        let lastLength;
        // Values for `limit`, per the spec:
        // If undefined: pow(2,32) - 1
        // If 0, Infinity, or NaN: 0
        // If positive number: limit = floor(limit); if (limit >= pow(2,32)) limit -= pow(2,32);
        // If negative number: pow(2,32) - floor(abs(limit))
        // If other: Type-convert, then use the above rules
        // This line fails in very strange ways for some values of `limit` in Opera 10.5-10.63, unless
        // Opera Dragonfly is open (go figure). It works in at least Opera 9.5-10.1 and 11+
        limit = (limit === undefined ? -1 : limit) >>> 0;
        xregexp_1.default.forEach(str, separator, (match) => {
            // This condition is not the same as `if (match[0].length)`
            if ((match.index + match[0].length) > lastLastIndex) {
                output.push(str.slice(lastLastIndex, match.index));
                if (match.length > 1 && match.index < str.length) {
                    Array.prototype.push.apply(output, match.slice(1));
                }
                lastLength = match[0].length;
                lastLastIndex = match.index + lastLength;
            }
        });
        if (lastLastIndex === str.length) {
            if (!exports.nativ.test.call(separator, '') || lastLength) {
                output.push('');
            }
        }
        else {
            output.push(str.slice(lastLastIndex));
        }
        separator.lastIndex = origLastIndex;
        return output.length > limit ? output.slice(0, limit) : output;
    };
})(fixed = exports.fixed || (exports.fixed = {}));
exports.default = fixed;
