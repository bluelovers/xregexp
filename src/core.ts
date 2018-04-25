/*!
 * XRegExp 4.1.1
 * <xregexp.com>
 * Steven Levithan (c) 2007-present MIT License
 */

/**
 * XRegExp provides augmented, extensible regular expressions. You get additional regex syntax and
 * flags, beyond what browsers support natively. XRegExp is also a regex utility belt with tools to
 * make your client-side grepping simpler and more powerful, while freeing you from related
 * cross-browser inconsistencies.
 */

import { fixed, nativ } from './fixed';
export { fixed, nativ }

import XRegExpObject from './class';

import { XRegExp } from './xregexp';

export { XRegExp }
export default XRegExp;

// ==--------------------------==
// Private stuff
// ==--------------------------==

// Property name used for extended regex instance data
export const REGEX_DATA = 'xregexp';
// Optional features that can be installed and uninstalled
export const features = {
    astral: false,
    namespacing: false
};

// Storage for regex syntax tokens added internally or by `XRegExp.addToken`
export const tokens = [];
// Token scopes
export const defaultScope = 'default';
export const classScope = 'class';
// Regexes that match native regex syntax, including octals
export const nativeTokens = {
    // Any native multicharacter token in default scope, or any single character
    'default': /\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|{[\dA-Fa-f]+})|c[A-Za-z]|[\s\S])|\(\?(?:[:=!]|<[=!])|[?*+]\?|{\d+(?:,\d*)?}\??|[\s\S]/,
    // Any native multicharacter token in character class scope, or any single character
    'class': /\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|{[\dA-Fa-f]+})|c[A-Za-z]|[\s\S])|[\s\S]/
};
// Any backreference or dollar-prefixed character in replacement strings
export const replacementToken = /\$(?:{([\w$]+)}|<([\w$]+)>|(\d\d?|[\s\S]))/g;
// Check for correct `exec` handling of nonparticipating capturing groups
export const correctExecNpcg = nativ.exec.call(/()??/, '')[1] === undefined;
// Check for ES6 `flags` prop support
export const hasFlagsProp = /x/.flags !== undefined;
// Shortcut to `Object.prototype.toString`
export const { toString } = {};

export function hasNativeFlag(flag)
{
    // Can't check based on the presence of properties/getters since browsers might support such
    // properties even when they don't support the corresponding flag in regex construction (tested
    // in Chrome 48, where `'unicode' in /x/` is true but trying to construct a regex with flag `u`
    // throws an error)
    let isSupported = true;
    try
    {
        // Can't use regex literals for testing even in a `try` because regex literals with
        // unsupported flags cause a compilation error in IE
        new RegExp('', flag);
    }
    catch (exception)
    {
        isSupported = false;
    }
    return isSupported;
}

// Check for ES6 `u` flag support
export const hasNativeU = hasNativeFlag('u');
// Check for ES6 `y` flag support
export const hasNativeY = hasNativeFlag('y');
// Tracker for known flags, including addon flags
export const registeredFlags = {
    g: true,
    i: true,
    m: true,
    u: hasNativeU,
    y: hasNativeY
};

/**
 * Attaches extended data and `XRegExp.prototype` properties to a regex object.
 *
 * @private
 * @param {RegExp} regex Regex to augment.
 * @param {Array} captureNames Array with capture names, or `null`.
 * @param {String} xSource XRegExp pattern used to generate `regex`, or `null` if N/A.
 * @param {String} xFlags XRegExp flags used to generate `regex`, or `null` if N/A.
 * @param {Boolean} [isInternalOnly=false] Whether the regex will be used only for internal
 *   operations, and never exposed to users. For internal-only regexes, we can improve perf by
 *   skipping some operations like attaching `XRegExp.prototype` properties.
 * @returns {RegExp} Augmented regex.
 */
export function augment(regex,
    captureNames: string[],
    xSource: string,
    xFlags: string,
    isInternalOnly?: boolean
): XRegExpObject
{
    regex[REGEX_DATA] = {
        captureNames
    };

    if (isInternalOnly)
    {
        return regex;
    }

    // Can't auto-inherit these since the XRegExp constructor returns a nonprimitive value
    if (regex.__proto__)
    {
        regex.__proto__ = XRegExp.prototype;
    }
    else
    {
        for (const p in XRegExp.prototype)
        {
            // An `XRegExp.prototype.hasOwnProperty(p)` check wouldn't be worth it here, since this
            // is performance sensitive, and enumerable `Object.prototype` or `RegExp.prototype`
            // extensions exist on `regex.prototype` anyway
            regex[p] = XRegExp.prototype[p];
        }
    }

    regex[REGEX_DATA].source = xSource;
    // Emulate the ES6 `flags` prop by ensuring flags are in alphabetical order
    regex[REGEX_DATA].flags = xFlags ? xFlags.split('').sort().join('') : xFlags;

    return regex;
}

/**
 * Removes any duplicate characters from the provided string.
 *
 * @private
 * @param {String} str String to remove duplicate characters from.
 * @returns {String} String with any duplicate characters removed.
 */
export function clipDuplicates(str)
{
    return nativ.replace.call(str, /([\s\S])(?=[\s\S]*\1)/g, '');
}

/**
 * Copies a regex object while preserving extended data and augmenting with `XRegExp.prototype`
 * properties. The copy has a fresh `lastIndex` property (set to zero). Allows adding and removing
 * flags g and y while copying the regex.
 *
 * @private
 * @param {RegExp} regex Regex to copy.
 * @param {Object} [options] Options object with optional properties:
 *   - `addG` {Boolean} Add flag g while copying the regex.
 *   - `addY` {Boolean} Add flag y while copying the regex.
 *   - `removeG` {Boolean} Remove flag g while copying the regex.
 *   - `removeY` {Boolean} Remove flag y while copying the regex.
 *   - `isInternalOnly` {Boolean} Whether the copied regex will be used only for internal
 *     operations, and never exposed to users. For internal-only regexes, we can improve perf by
 *     skipping some operations like attaching `XRegExp.prototype` properties.
 *   - `source` {String} Overrides `<regex>.source`, for special cases.
 * @returns {RegExp} Copy of the provided regex, possibly with modified flags.
 */
export function copyRegex(regex, options?): XRegExpObject
{
    if (!XRegExpObject.isRegExp(regex))
    {
        throw new TypeError('Type RegExp expected');
    }

    const xData = regex[REGEX_DATA] || {};
    let flags = getNativeFlags(regex);
    let flagsToAdd = '';
    let flagsToRemove = '';
    let xregexpSource = null;
    let xregexpFlags = null;

    options = options || {};

    if (options.removeG)
    {flagsToRemove += 'g';}
    if (options.removeY)
    {flagsToRemove += 'y';}
    if (flagsToRemove)
    {
        flags = nativ.replace.call(flags, new RegExp(`[${flagsToRemove}]+`, 'g'), '');
    }

    if (options.addG)
    {flagsToAdd += 'g';}
    if (options.addY)
    {flagsToAdd += 'y';}
    if (flagsToAdd)
    {
        flags = clipDuplicates(flags + flagsToAdd);
    }

    if (!options.isInternalOnly)
    {
        if (xData.source !== undefined)
        {
            xregexpSource = xData.source;
        }
        // null or undefined; don't want to add to `flags` if the previous value was null, since
        // that indicates we're not tracking original precompilation flags
        if (xData.flags != null)
        {
            // Flags are only added for non-internal regexes by `XRegExp.globalize`. Flags are never
            // removed for non-internal regexes, so don't need to handle it
            xregexpFlags = flagsToAdd ? clipDuplicates(xData.flags + flagsToAdd) : xData.flags;
        }
    }

    // Augment with `XRegExp.prototype` properties, but use the native `RegExp` constructor to avoid
    // searching for special tokens. That would be wrong for regexes constructed by `RegExp`, and
    // unnecessary for regexes constructed by `XRegExp` because the regex has already undergone the
    // translation to native regex syntax
    regex = augment(
        new RegExp(options.source || regex.source, flags),
        hasNamedCapture(regex) ? xData.captureNames.slice(0) : null,
        xregexpSource,
        xregexpFlags,
        options.isInternalOnly
    );

    return regex;
}

/**
 * Converts hexadecimal to decimal.
 *
 * @private
 * @param {String} hex
 * @returns {Number}
 */
export function dec(hex)
{
    return parseInt(hex, 16);
}

/**
 * Returns a pattern that can be used in a native RegExp in place of an ignorable token such as an
 * inline comment or whitespace with flag x. This is used directly as a token handler function
 * passed to `XRegExp.addToken`.
 *
 * @private
 * @param {String} match Match arg of `XRegExp.addToken` handler
 * @param {String} scope Scope arg of `XRegExp.addToken` handler
 * @param {String} flags Flags arg of `XRegExp.addToken` handler
 * @returns {String} Either '' or '(?:)', depending on which is needed in the context of the match.
 */
export function getContextualTokenSeparator(match, scope, flags)
{
    if (
        // No need to separate tokens if at the beginning or end of a group
        match.input[match.index - 1] === '(' ||
        match.input[match.index + match[0].length] === ')' ||

        // No need to separate tokens if before or after a `|`
        match.input[match.index - 1] === '|' ||
        match.input[match.index + match[0].length] === '|' ||

        // No need to separate tokens if at the beginning or end of the pattern
        match.index < 1 ||
        match.index + match[0].length >= match.input.length ||

        // No need to separate tokens if at the beginning of a noncapturing group or lookahead.
        // The way this is written relies on:
        // - The search regex matching only 3-char strings.
        // - Although `substr` gives chars from the end of the string if given a negative index,
        //   the resulting substring will be too short to match. Ex: `'abcd'.substr(-1, 3) === 'd'`
        nativ.test.call(/^\(\?[:=!]/, match.input.substr(match.index - 3, 3)) ||

        // Avoid separating tokens when the following token is a quantifier
        isQuantifierNext(match.input, match.index + match[0].length, flags)
    )
    {
        return '';
    }
    // Keep tokens separated. This avoids e.g. inadvertedly changing `\1 1` or `\1(?#)1` to `\11`.
    // This also ensures all tokens remain as discrete atoms, e.g. it avoids converting the syntax
    // error `(? :` into `(?:`.
    return '(?:)';
}

/**
 * Returns native `RegExp` flags used by a regex object.
 *
 * @private
 * @param {RegExp} regex Regex to check.
 * @returns {String} Native flags in use.
 */
export function getNativeFlags(regex)
{
    return hasFlagsProp ?
        regex.flags :
        // Explicitly using `RegExp.prototype.toString` (rather than e.g. `String` or concatenation
        // with an empty string) allows this to continue working predictably when
        // `XRegExp.proptotype.toString` is overridden
        nativ.exec.call(/\/([a-z]*)$/i, RegExp.prototype.toString.call(regex))[1];
}

/**
 * Determines whether a regex has extended instance data used to track capture names.
 *
 * @private
 * @param {RegExp} regex Regex to check.
 * @returns {Boolean} Whether the regex uses named capture.
 */
export function hasNamedCapture(regex)
{
    return !!(regex[REGEX_DATA] && regex[REGEX_DATA].captureNames);
}

/**
 * Converts decimal to hexadecimal.
 *
 * @private
 * @param {Number|String} dec
 * @returns {String}
 */
export function hex(dec)
{
    return parseInt(dec, 10).toString(16);
}

/**
 * Checks whether the next nonignorable token after the specified position is a quantifier.
 *
 * @private
 * @param {String} pattern Pattern to search within.
 * @param {Number} pos Index in `pattern` to search at.
 * @param {String} flags Flags used by the pattern.
 * @returns {Boolean} Whether the next nonignorable token is a quantifier.
 */
export function isQuantifierNext(pattern, pos, flags)
{
    const inlineCommentPattern = '\\(\\?#[^)]*\\)';
    const lineCommentPattern = '#[^#\\n]*';
    const quantifierPattern = '[?*+]|{\\d+(?:,\\d*)?}';
    return nativ.test.call(
        flags.includes('x') ?
            // Ignore any leading whitespace, line comments, and inline comments
            new RegExp(`^(?:\\s|${lineCommentPattern}|${inlineCommentPattern})*(?:${quantifierPattern})`) :
            // Ignore any leading inline comments
            new RegExp(`^(?:${inlineCommentPattern})*(?:${quantifierPattern})`),
        pattern.slice(pos)
    );
}

/**
 * Determines whether a value is of the specified type, by resolving its internal [[Class]].
 *
 * @private
 * @param {*} value Object to check.
 * @param {String} type Type to check for, in TitleCase.
 * @returns {Boolean} Whether the object matches the type.
 */
export function isType(value, type)
{
    return toString.call(value) === `[object ${type}]`;
}

/**
 * Adds leading zeros if shorter than four characters. Used for fixed-length hexadecimal values.
 *
 * @private
 * @param {String} str
 * @returns {String}
 */
export function pad4(str)
{
    while (str.length < 4)
    {
        str = `0${str}`;
    }
    return str;
}

/**
 * Checks for flag-related errors, and strips/applies flags in a leading mode modifier. Offloads
 * the flag preparation logic from the `XRegExp` constructor.
 *
 * @private
 * @param {String} pattern Regex pattern, possibly with a leading mode modifier.
 * @param {String} flags Any combination of flags.
 * @returns {Object} Object with properties `pattern` and `flags`.
 */
export function prepareFlags(pattern, flags)
{
    // Recent browsers throw on duplicate flags, so copy this behavior for nonnative flags
    if (clipDuplicates(flags) !== flags)
    {
        throw new SyntaxError(`Invalid duplicate regex flag ${flags}`);
    }

    // Strip and apply a leading mode modifier with any combination of flags except g or y
    pattern = nativ.replace.call(pattern, /^\(\?([\w$]+)\)/, ($0, $1) =>
    {
        if (nativ.test.call(/[gy]/, $1))
        {
            throw new SyntaxError(`Cannot use flag g or y in mode modifier ${$0}`);
        }
        // Allow duplicate flags within the mode modifier
        flags = clipDuplicates(flags + $1);
        return '';
    });

    // Throw on unknown native or nonnative flags
    for (const flag of flags)
    {
        if (!registeredFlags[flag])
        {
            throw new SyntaxError(`Unknown regex flag ${flag}`);
        }
    }

    return {
        pattern,
        flags
    };
}

/**
 * Prepares an options object from the given value.
 *
 * @private
 * @param {String|Object} value Value to convert to an options object.
 * @returns {Object} Options object.
 */
export function prepareOptions(value)
{
    const options = {};

    if (isType(value, 'String'))
    {
        XRegExp.forEach(value, /[^\s,]+/, (match) =>
        {
            options[match] = true;
        });

        return options;
    }

    return value;
}

/**
 * Registers a flag so it doesn't throw an 'unknown flag' error.
 *
 * @private
 * @param {String} flag Single-character flag to register.
 */
export function registerFlag(flag)
{
    if (!/^[\w$]$/.test(flag))
    {
        throw new Error('Flag must be a single character A-Za-z0-9_$');
    }

    registeredFlags[flag] = true;
}

/**
 * Runs built-in and custom regex syntax tokens in reverse insertion order at the specified
 * position, until a match is found.
 *
 * @private
 * @param {String} pattern Original pattern from which an XRegExp object is being built.
 * @param {String} flags Flags being used to construct the regex.
 * @param {Number} pos Position to search for tokens within `pattern`.
 * @param {Number} scope Regex scope to apply: 'default' or 'class'.
 * @param {Object} context Context object to use for token handler functions.
 * @returns {Object} Object with properties `matchLength`, `output`, and `reparse`; or `null`.
 */
export function runTokens(pattern, flags: string, pos: number, scope: string, context)
{
    let i = tokens.length;
    const leadChar = pattern[pos];
    let result = null;
    let match;
    let t;

    // Run in reverse insertion order
    while (i--)
    {
        t = tokens[i];
        if (
            (t.leadChar && t.leadChar !== leadChar) ||
            (t.scope !== scope && t.scope !== 'all') ||
            (t.flag && !flags.includes(t.flag))
        )
        {
            continue;
        }

        match = XRegExp.exec(pattern, t.regex, pos, 'sticky');
        if (match)
        {
            result = {
                matchLength: match[0].length,
                output: t.handler.call(context, match, scope, flags),
                reparse: t.reparse
            };
            // Finished with token tests
            break;
        }
    }

    return result;
}

/**
 * Enables or disables implicit astral mode opt-in. When enabled, flag A is automatically added to
 * all new regexes created by XRegExp. This causes an error to be thrown when creating regexes if
 * the Unicode Base addon is not available, since flag A is registered by that addon.
 *
 * @private
 * @param {Boolean} on `true` to enable; `false` to disable.
 */
export function setAstral(on)
{
    features.astral = on;
}

/**
 * Adds named capture groups to the `groups` property of match arrays. See here for details:
 * https://github.com/tc39/proposal-regexp-named-groups
 *
 * @private
 * @param {Boolean} on `true` to enable; `false` to disable.
 */
export function setNamespacing(on)
{
    features.namespacing = on;
}

/**
 * Returns the object, or throws an error if it is `null` or `undefined`. This is used to follow
 * the ES5 abstract operation `ToObject`.
 *
 * @private
 * @param {*} value Object to check and return.
 * @returns {*} The provided object.
 */
export function toObject(value)
{
    // null or undefined
    if (value == null)
    {
        throw new TypeError('Cannot convert null or undefined to object');
    }

    return value;
}

