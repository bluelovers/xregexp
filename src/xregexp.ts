import XRegExpObject from './class';
import {
	augment,
	classScope,
	clipDuplicates,
	copyRegex,
	dec, defaultScope,
	features, getContextualTokenSeparator, hasNativeFlag, hasNativeU, hasNativeY,
	hex,
	isType, nativeTokens,
	pad4, prepareFlags,
	prepareOptions, REGEX_DATA,
	registerFlag, runTokens,
	setAstral,
	setNamespacing, tokens,
	toObject,

} from './core';
import { fixed, nativ } from './fixed';

// Storage for regexes cached by `XRegExp.cache`
export let regexCache = {};
// Storage for pattern details cached by the `XRegExp` constructor
export let patternCache = {};

// ==--------------------------==
// Constructor
// ==--------------------------==

export type IOptions = {
	disableUseNativeRegExp?: boolean,
}

/**
 * Creates an extended regular expression object for matching text with a pattern. Differs from a
 * native regular expression in that additional syntax and flags are supported. The returned object
 * is in fact a native `RegExp` and works with all native methods.
 *
 * @class XRegExp
 * @constructor
 * @param {String|RegExp} pattern Regex pattern string, or an existing regex object to copy.
 * @param {String} [flags] Any combination of flags.
 *   Native flags:
 *     - `g` - global
 *     - `i` - ignore case
 *     - `m` - multiline anchors
 *     - `u` - unicode (ES6)
 *     - `y` - sticky (Firefox 3+, ES6)
 *   Additional XRegExp flags:
 *     - `n` - explicit capture
 *     - `s` - dot matches all (aka singleline)
 *     - `x` - free-spacing and line comments (aka extended)
 *     - `A` - astral (requires the Unicode Base addon)
 *   Flags cannot be provided when constructing one `RegExp` from another.
 * @returns {RegExp} Extended regular expression object.
 * @example
 *
 * // With named capture and flag x
 * XRegExp(`(?<year>  [0-9]{4} ) -?  # year
 *          (?<month> [0-9]{2} ) -?  # month
 *          (?<day>   [0-9]{2} )     # day`, 'x');
 *
 * // Providing a regex object copies it. Native regexes are recompiled using native (not XRegExp)
 * // syntax. Copies maintain extended data, are augmented with `XRegExp.prototype` properties, and
 * // have fresh `lastIndex` properties (set to zero).
 * XRegExp(/regex/);
 */
export function XRegExp<T extends RegExp>(pattern: string | T, flags?: string, options: IOptions = {}): XRegExpObject
{
	if (!options.disableUseNativeRegExp && XRegExpObject.isRegExp(pattern) && !XRegExpObject.isXRegExpObject(pattern))
	{
		flags = typeof flags == 'string' ? flags : pattern.flags;
		pattern = pattern.source;
	}
	else if (XRegExpObject.isRegExp(pattern))
	{
		if (flags !== undefined)
		{
			throw new TypeError('Cannot supply flags when copying a RegExp');
		}
		return copyRegex(pattern);
	}

	// Copy the argument behavior of `RegExp`
	pattern = pattern === undefined ? '' : String(pattern);
	flags = flags === undefined ? '' : String(flags);

	if (XRegExp.isInstalled('astral') && !flags.includes('A'))
	{
		// This causes an error to be thrown if the Unicode Base addon is not available
		flags += 'A';
	}

	if (!patternCache[pattern])
	{
		patternCache[pattern] = {};
	}

	if (!patternCache[pattern][flags])
	{
		const context = {
			hasNamedCapture: false,
			captureNames: []
		};
		let scope = defaultScope;
		let output = '';
		let pos = 0;
		let result;

		// Check for flag-related errors, and strip/apply flags in a leading mode modifier
		const applied = prepareFlags(pattern, flags);
		let appliedPattern = applied.pattern;
		const appliedFlags = applied.flags;

		// Use XRegExp's tokens to translate the pattern to a native regex pattern.
		// `appliedPattern.length` may change on each iteration if tokens use `reparse`
		while (pos < appliedPattern.length)
		{
			do
			{
				// Check for custom tokens at the current position
				result = runTokens(appliedPattern, appliedFlags, pos, scope, context);
				// If the matched token used the `reparse` option, splice its output into the
				// pattern before running tokens again at the same position
				if (result && result.reparse)
				{
					appliedPattern = appliedPattern.slice(0, pos) +
						result.output +
						appliedPattern.slice(pos + result.matchLength);
				}
			}
			while (result && result.reparse);

			if (result)
			{
				output += result.output;
				pos += (result.matchLength || 1);
			}
			else
			{
				// Get the native token at the current position
				const [token] = XRegExp.exec(appliedPattern, nativeTokens[scope], pos, 'sticky');
				output += token;
				pos += token.length;
				if (token === '[' && scope === defaultScope)
				{
					scope = classScope;
				}
				else if (token === ']' && scope === classScope)
				{
					scope = defaultScope;
				}
			}
		}

		patternCache[pattern][flags] = {
			// Use basic cleanup to collapse repeated empty groups like `(?:)(?:)` to `(?:)`. Empty
			// groups are sometimes inserted during regex transpilation in order to keep tokens
			// separated. However, more than one empty group in a row is never needed.
			pattern: nativ.replace.call(output, /(?:\(\?:\))+/g, '(?:)'),
			// Strip all but native flags
			flags: nativ.replace.call(appliedFlags, /[^gimuy]+/g, ''),
			// `context.captureNames` has an item for each capturing group, even if unnamed
			captures: context.hasNamedCapture ? context.captureNames : null
		};
	}

	const generated = patternCache[pattern][flags];
	return augment(
		new RegExp(generated.pattern, generated.flags),
		generated.captures,
		pattern,
		flags
	);
}

export namespace XRegExp
{
	// Add `RegExp.prototype` to the prototype chain
	//export const prototype = new RegExp();
	//export const prototype = RegExp.prototype;
	// @ts-ignore
	//export const prototype = new XRegExpObject() as typeof RegExp.prototype;
	export const prototype = new RegExp() as typeof RegExp.prototype;

// ==--------------------------==
// Public properties
// ==--------------------------==

	/**
	 * The XRegExp version number as a string containing three dot-separated parts. For example,
	 * '2.0.0-beta-3'.
	 *
	 * @static
	 * @memberOf XRegExp
	 * @type String
	 */
	export const version = '4.1.1';

// ==--------------------------==
// Public methods
// ==--------------------------==

// Intentionally undocumented; used in tests and addons
	export const _clipDuplicates = clipDuplicates;
	export const _hasNativeFlag = hasNativeFlag;
	export const _dec = dec;
	export const _hex = hex;
	export const _pad4 = pad4;

	export type ITokenScope = 'default' | 'class' | 'all';

	export type ITokenOptions = {
		scope?: ITokenScope,
		flag?: string,
		optionalFlags?: string,
		reparse?: boolean,
		leadChar?: string,
	}

	export interface ITokenHandler
	{
		(match: RegExpMatchArray, scope: ITokenScope, flags: string): string
	}

	export type XRegExpExecArray<T extends {} = any> = RegExpExecArray & {
		0: string,
		[n: number]: string,
		index: number,
		input: string,
	} & {
		[key: string]: string,
	} & T;

	/**
	 * Extends XRegExp syntax and allows custom flags. This is used internally and can be used to
	 * create XRegExp addons. If more than one token can match the same string, the last added wins.
	 *
	 * @memberOf XRegExp
	 * @param {RegExp} regex Regex object that matches the new token.
	 * @param {Function} handler Function that returns a new pattern string (using native regex syntax)
	 *   to replace the matched token within all future XRegExp regexes. Has access to persistent
	 *   properties of the regex being built, through `this`. Invoked with three arguments:
	 *   - The match array, with named backreference properties.
	 *   - The regex scope where the match was found: 'default' or 'class'.
	 *   - The flags used by the regex, including any flags in a leading mode modifier.
	 *   The handler function becomes part of the XRegExp construction process, so be careful not to
	 *   construct XRegExps within the function or you will trigger infinite recursion.
	 * @param {Object} [options] Options object with optional properties:
	 *   - `scope` {String} Scope where the token applies: 'default', 'class', or 'all'.
	 *   - `flag` {String} Single-character flag that triggers the token. This also registers the
	 *     flag, which prevents XRegExp from throwing an 'unknown flag' error when the flag is used.
	 *   - `optionalFlags` {String} Any custom flags checked for within the token `handler` that are
	 *     not required to trigger the token. This registers the flags, to prevent XRegExp from
	 *     throwing an 'unknown flag' error when any of the flags are used.
	 *   - `reparse` {Boolean} Whether the `handler` function's output should not be treated as
	 *     final, and instead be reparseable by other tokens (including the current token). Allows
	 *     token chaining or deferring.
	 *   - `leadChar` {String} Single character that occurs at the beginning of any successful match
	 *     of the token (not always applicable). This doesn't change the behavior of the token unless
	 *     you provide an erroneous value. However, providing it can increase the token's performance
	 *     since the token can be skipped at any positions where this character doesn't appear.
	 * @example
	 *
	 * // Basic usage: Add \a for the ALERT control code
	 * XRegExp.addToken(
	 *   /\\a/,
	 *   () => '\\x07',
	 *   {scope: 'all'}
	 * );
	 * XRegExp('\\a[\\a-\\n]+').test('\x07\n\x07'); // -> true
	 *
	 * // Add the U (ungreedy) flag from PCRE and RE2, which reverses greedy and lazy quantifiers.
	 * // Since `scope` is not specified, it uses 'default' (i.e., transformations apply outside of
	 * // character classes only)
	 * XRegExp.addToken(
	 *   /([?*+]|{\d+(?:,\d*)?})(\??)/,
	 *   (match) => `${match[1]}${match[2] ? '' : '?'}`,
	 *   {flag: 'U'}
	 * );
	 * XRegExp('a+', 'U').exec('aaa')[0]; // -> 'a'
	 * XRegExp('a+?', 'U').exec('aaa')[0]; // -> 'aaa'
	 */
	export const addToken = (regex: RegExp, handler: ITokenHandler, options?: ITokenOptions) =>
	{
		options = options || {};
		let { optionalFlags } = options;

		if (options.flag)
		{
			registerFlag(options.flag);
		}

		if (optionalFlags)
		{
			optionalFlags = nativ.split.call(optionalFlags, '');
			for (const flag of optionalFlags)
			{
				registerFlag(flag);
			}
		}

		// Add to the private list of syntax tokens
		tokens.push({
			regex: copyRegex(regex, {
				addG: true,
				addY: hasNativeY,
				isInternalOnly: true
			}),
			handler,
			scope: options.scope || defaultScope,
			flag: options.flag,
			reparse: options.reparse,
			leadChar: options.leadChar
		});

		// Reset the pattern cache used by the `XRegExp` constructor, since the same pattern and flags
		// might now produce different results
		XRegExp.cache.flush('patterns');
	};

	/**
	 * Caches and returns the result of calling `XRegExp(pattern, flags)`. On any subsequent call with
	 * the same pattern and flag combination, the cached copy of the regex is returned.
	 *
	 * @memberOf XRegExp
	 * @param {String} pattern Regex pattern string.
	 * @param {String} [flags] Any combination of XRegExp flags.
	 * @returns {RegExp} Cached XRegExp object.
	 * @example
	 *
	 * while (match = XRegExp.cache('.', 'gs').exec(str)) {
 *   // The regex is compiled once only
 * }
	 */
	export function cache(pattern: string, flags?: string)
	{
		if (!regexCache[pattern])
		{
			regexCache[pattern] = {};
		}
		return regexCache[pattern][flags] || (
			regexCache[pattern][flags] = XRegExp(pattern, flags)
		);
	}

	export namespace cache
	{
		// Intentionally undocumented; used in tests
		export function flush(cacheName: string)
		{
			if (cacheName === 'patterns')
			{
				// Flush the pattern cache used by the `XRegExp` constructor
				patternCache = {};
			}
			else
			{
				// Flush the regex cache populated by `XRegExp.cache`
				regexCache = {};
			}
		}
	}

	/**
	 * Escapes any regular expression metacharacters, for use when matching literal strings. The result
	 * can safely be used at any point within a regex that uses any flags.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to escape.
	 * @returns {String} String with regex metacharacters escaped.
	 * @example
	 *
	 * XRegExp.escape('Escaped? <.>');
	 * // -> 'Escaped\?\ <\.>'
	 */
	export const escape = XRegExpObject.escape;

	/**
	 * Executes a regex search in a specified string. Returns a match array or `null`. If the provided
	 * regex uses named capture, named backreference properties are included on the match array.
	 * Optional `pos` and `sticky` arguments specify the search start position, and whether the match
	 * must start at the specified position only. The `lastIndex` property of the provided regex is not
	 * used, but is updated for compatibility. Also fixes browser bugs compared to the native
	 * `RegExp.prototype.exec` and can be used reliably cross-browser.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to search.
	 * @param {RegExp} regex Regex to search with.
	 * @param {Number} [pos=0] Zero-based index at which to start the search.
	 * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
	 *   only. The string `'sticky'` is accepted as an alternative to `true`.
	 * @returns {Array} Match array with named backreference properties, or `null`.
	 * @example
	 *
	 * // Basic use, with named backreference
	 * let match = XRegExp.exec('U+2620', XRegExp('U\\+(?<hex>[0-9A-F]{4})'));
	 * match.hex; // -> '2620'
	 *
	 * // With pos and sticky, in a loop
	 * let pos = 2, result = [], match;
	 * while (match = XRegExp.exec('<1><2><3><4>5<6>', /<(\d)>/, pos, 'sticky')) {
 *   result.push(match[1]);
 *   pos = match.index + match[0].length;
 * }
	 * // result -> ['2', '3', '4']
	 */
	export const exec = <T extends {} = any>(str, regex: RegExp, pos?: number, sticky?: boolean | string) =>
	{
		let cacheKey = 'g';
		let addY = false;
		let fakeY = false;
		let match: XRegExpExecArray<T>;

		addY = hasNativeY && !!(sticky || (regex.sticky && sticky !== false));
		if (addY)
		{
			cacheKey += 'y';
		}
		else if (sticky)
		{
			// Simulate sticky matching by appending an empty capture to the original regex. The
			// resulting regex will succeed no matter what at the current index (set with `lastIndex`),
			// and will not search the rest of the subject string. We'll know that the original regex
			// has failed if that last capture is `''` rather than `undefined` (i.e., if that last
			// capture participated in the match).
			fakeY = true;
			cacheKey += 'FakeY';
		}

		regex[REGEX_DATA] = regex[REGEX_DATA] || {};

		// Shares cached copies with `XRegExp.match`/`replace`
		const r2 = regex[REGEX_DATA][cacheKey] || (
			regex[REGEX_DATA][cacheKey] = copyRegex(regex, {
				addG: true,
				addY,
				source: fakeY ? `${regex.source}|()` : undefined,
				removeY: sticky === false,
				isInternalOnly: true
			})
		);

		pos = pos || 0;
		r2.lastIndex = pos;

		// Fixed `exec` required for `lastIndex` fix, named backreferences, etc.
		match = fixed.exec.call(r2, str);

		// Get rid of the capture added by the pseudo-sticky matcher if needed. An empty string means
		// the original regexp failed (see above).
		if (fakeY && match && match.pop() === '')
		{
			match = null;
		}

		if (regex.global)
		{
			regex.lastIndex = match ? r2.lastIndex : 0;
		}

		return match;
	};

	export interface IForEachCallback<T extends RegExp>
	{
		(match: XRegExpExecArray, index: number, input: string, regex: T): void
	}

	/**
	 * Executes a provided function once per regex match. Searches always start at the beginning of the
	 * string and continue until the end, regardless of the state of the regex's `global` property and
	 * initial `lastIndex`.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to search.
	 * @param {RegExp} regex Regex to search with.
	 * @param {Function} callback Function to execute for each match. Invoked with four arguments:
	 *   - The match array, with named backreference properties.
	 *   - The zero-based match index.
	 *   - The string being traversed.
	 *   - The regex object being used to traverse the string.
	 * @example
	 *
	 * // Extracts every other digit from a string
	 * const evens = [];
	 * XRegExp.forEach('1a2345', /\d/, (match, i) => {
 *   if (i % 2) evens.push(+match[0]);
 * });
	 * // evens -> [2, 4]
	 */
	export const forEach = <T extends RegExp>(str,
		regex: T,
		callback: IForEachCallback<T>,
	) =>
	{
		let pos = 0;
		let i = -1;
		let match: XRegExpExecArray;

		while ((match = XRegExp.exec(str, regex, pos)))
		{
			// Because `regex` is provided to `callback`, the function could use the deprecated/
			// nonstandard `RegExp.prototype.compile` to mutate the regex. However, since `XRegExp.exec`
			// doesn't use `lastIndex` to set the search position, this can't lead to an infinite loop,
			// at least. Actually, because of the way `XRegExp.exec` caches globalized versions of
			// regexes, mutating the regex will not have any effect on the iteration or matched strings,
			// which is a nice side effect that brings extra safety.
			callback(match, ++i, str, regex);

			pos = match.index + (match[0].length || 1);
		}
	};

	/**
	 * Copies a regex object and adds flag `g`. The copy maintains extended data, is augmented with
	 * `XRegExp.prototype` properties, and has a fresh `lastIndex` property (set to zero). Native
	 * regexes are not recompiled using XRegExp syntax.
	 *
	 * @memberOf XRegExp
	 * @param {RegExp} regex Regex to globalize.
	 * @returns {RegExp} Copy of the provided regex with flag `g` added.
	 * @example
	 *
	 * const globalCopy = XRegExp.globalize(/regex/);
	 * globalCopy.global; // -> true
	 */
	export const globalize = <T extends RegExp>(regex: T) => copyRegex(regex, { addG: true }) as XRegExpObject & {
		global: true,
	};

	/**
	 * Installs optional features according to the specified options. Can be undone using
	 * `XRegExp.uninstall`.
	 *
	 * @memberOf XRegExp
	 * @param {Object|String} options Options object or string.
	 * @example
	 *
	 * // With an options object
	 * XRegExp.install({
 *   // Enables support for astral code points in Unicode addons (implicitly sets flag A)
 *   astral: true,
 *
 *   // Adds named capture groups to the `groups` property of matches
 *   namespacing: true
 * });
	 *
	 * // With an options string
	 * XRegExp.install('astral namespacing');
	 */
	export const install = (options) =>
	{
		options = prepareOptions(options);

		if (!features.astral && options.astral)
		{
			setAstral(true);
		}

		if (!features.namespacing && options.namespacing)
		{
			setNamespacing(true);
		}
	};

	/**
	 * Checks whether an individual optional feature is installed.
	 *
	 * @memberOf XRegExp
	 * @param {String} feature Name of the feature to check. One of:
	 *   - `astral`
	 *   - `namespacing`
	 * @returns {Boolean} Whether the feature is installed.
	 * @example
	 *
	 * XRegExp.isInstalled('astral');
	 */
	export const isInstalled = (feature) => !!(features[feature]);

	/**
	 * Returns `true` if an object is a regex; `false` if it isn't. This works correctly for regexes
	 * created in another frame, when `instanceof` and `constructor` checks would fail.
	 *
	 * @memberOf XRegExp
	 * @param {*} value Object to check.
	 * @returns {Boolean} Whether the object is a `RegExp` object.
	 * @example
	 *
	 * XRegExp.isRegExp('string'); // -> false
	 * XRegExp.isRegExp(/regex/i); // -> true
	 * XRegExp.isRegExp(RegExp('^', 'm')); // -> true
	 * XRegExp.isRegExp(XRegExp('(?s).')); // -> true
	 */
	export const isRegExp = XRegExpObject.isRegExp; // isType(value, 'RegExp');

	export const isXRegExpObject = XRegExpObject.isXRegExpObject;

	/**
	 * Returns the first matched string, or in global mode, an array containing all matched strings.
	 * This is essentially a more convenient re-implementation of `String.prototype.match` that gives
	 * the result types you actually want (string instead of `exec`-style array in match-first mode,
	 * and an empty array instead of `null` when no matches are found in match-all mode). It also lets
	 * you override flag g and ignore `lastIndex`, and fixes browser bugs.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to search.
	 * @param {RegExp} regex Regex to search with.
	 * @param {String} [scope='one'] Use 'one' to return the first match as a string. Use 'all' to
	 *   return an array of all matched strings. If not explicitly specified and `regex` uses flag g,
	 *   `scope` is 'all'.
	 * @returns {String|Array} In match-first mode: First match as a string, or `null`. In match-all
	 *   mode: Array of all matched strings, or an empty array.
	 * @example
	 *
	 * // Match first
	 * XRegExp.match('abc', /\w/); // -> 'a'
	 * XRegExp.match('abc', /\w/g, 'one'); // -> 'a'
	 * XRegExp.match('abc', /x/g, 'one'); // -> null
	 *
	 * // Match all
	 * XRegExp.match('abc', /\w/g); // -> ['a', 'b', 'c']
	 * XRegExp.match('abc', /\w/, 'all'); // -> ['a', 'b', 'c']
	 * XRegExp.match('abc', /x/, 'all'); // -> []
	 */
	export const match = <T extends RegExp>(str, regex: T, scope?: 'all' | 'one') =>
	{
		const global = (regex.global && scope !== 'one') || scope === 'all';
		const cacheKey = ((global ? 'g' : '') + (regex.sticky ? 'y' : '')) || 'noGY';

		regex[REGEX_DATA] = regex[REGEX_DATA] || {};

		// Shares cached copies with `XRegExp.exec`/`replace`
		const r2 = regex[REGEX_DATA][cacheKey] || (
			regex[REGEX_DATA][cacheKey] = copyRegex(regex, {
				addG: !!global,
				removeG: scope === 'one',
				isInternalOnly: true
			})
		);

		const result: RegExpExecArray = nativ.match.call(toObject(str), r2);

		if (regex.global)
		{
			regex.lastIndex = (
				(scope === 'one' && result) ?
					// Can't use `r2.lastIndex` since `r2` is nonglobal in this case
					(result.index + result[0].length) : 0
			);
		}

		return global ? (result || ([] as string[])) : (result && result[0]);
	};

	export type IMatchChainItem = {
		regex: RegExp,
		backref?,
	}

	export type IMatchChain = RegExp | IMatchChainItem;

	/**
	 * Retrieves the matches from searching a string using a chain of regexes that successively search
	 * within previous matches. The provided `chain` array can contain regexes and or objects with
	 * `regex` and `backref` properties. When a backreference is specified, the named or numbered
	 * backreference is passed forward to the next regex or returned.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to search.
	 * @param {Array} chain Regexes that each search for matches within preceding results.
	 * @returns {Array} Matches by the last regex in the chain, or an empty array.
	 * @example
	 *
	 * // Basic usage; matches numbers within <b> tags
	 * XRegExp.matchChain('1 <b>2</b> 3 <b>4 a 56</b>', [
	 *   XRegExp('(?is)<b>.*?</b>'),
	 *   /\d+/
	 * ]);
	 * // -> ['2', '4', '56']
	 *
	 * // Passing forward and returning specific backreferences
	 * html = '<a href="http://xregexp.com/api/">XRegExp</a>\
	 *         <a href="http://www.google.com/">Google</a>';
	 * XRegExp.matchChain(html, [
	 *   {regex: /<a href="([^"]+)">/i, backref: 1},
	 *   {regex: XRegExp('(?i)^https?://(?<domain>[^/?#]+)'), backref: 'domain'}
	 * ]);
	 * // -> ['xregexp.com', 'www.google.com']
	 */
	export const matchChain = (str, chain: IMatchChain[]): string[] => (function recurseChain(values, level)
	{
		const item = ((chain[level] as IMatchChainItem).regex
			? chain[level]
			: { regex: chain[level] }) as IMatchChainItem;
		const matches: string[] = [];

		function addMatch(match)
		{
			if (item.backref)
			{
				const ERR_UNDEFINED_GROUP = `Backreference to undefined group: ${item.backref}`;
				const isNamedBackref = isNaN(item.backref);

				if (isNamedBackref && XRegExp.isInstalled('namespacing'))
				{
					// `groups` has `null` as prototype, so using `in` instead of `hasOwnProperty`
					if (!(item.backref in match.groups))
					{
						throw new ReferenceError(ERR_UNDEFINED_GROUP);
					}
				}
				else if (!match.hasOwnProperty(item.backref))
				{
					throw new ReferenceError(ERR_UNDEFINED_GROUP);
				}

				const backrefValue = isNamedBackref && XRegExp.isInstalled('namespacing') ?
					match.groups[item.backref] :
					match[item.backref];

				matches.push(backrefValue || '');
			}
			else
			{
				matches.push(match[0]);
			}
		}

		for (const value of values)
		{
			XRegExp.forEach(value, item.regex, addMatch);
		}

		return ((level === chain.length - 1) || !matches.length) ?
			matches :
			recurseChain(matches, level + 1);
	}([str], 0));

	/**
	 * Returns a new string with one or all matches of a pattern replaced. The pattern can be a string
	 * or regex, and the replacement can be a string or a function to be called for each match. To
	 * perform a global search and replace, use the optional `scope` argument or include flag g if using
	 * a regex. Replacement strings can use `${n}` or `$<n>` for named and numbered backreferences.
	 * Replacement functions can use named backreferences via `arguments[0].name`. Also fixes browser
	 * bugs compared to the native `String.prototype.replace` and can be used reliably cross-browser.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to search.
	 * @param {RegExp|String} search Search pattern to be replaced.
	 * @param {String|Function} replacement Replacement string or a function invoked to create it.
	 *   Replacement strings can include special replacement syntax:
	 *     - $$ - Inserts a literal $ character.
	 *     - $&, $0 - Inserts the matched substring.
	 *     - $` - Inserts the string that precedes the matched substring (left context).
	 *     - $' - Inserts the string that follows the matched substring (right context).
	 *     - $n, $nn - Where n/nn are digits referencing an existent capturing group, inserts
	 *       backreference n/nn.
	 *     - ${n}, $<n> - Where n is a name or any number of digits that reference an existent capturing
	 *       group, inserts backreference n.
	 *   Replacement functions are invoked with three or more arguments:
	 *     - The matched substring (corresponds to $& above). Named backreferences are accessible as
	 *       properties of this first argument.
	 *     - 0..n arguments, one for each backreference (corresponding to $1, $2, etc. above).
	 *     - The zero-based index of the match within the total search string.
	 *     - The total string being searched.
	 * @param {String} [scope='one'] Use 'one' to replace the first match only, or 'all'. If not
	 *   explicitly specified and using a regex with flag g, `scope` is 'all'.
	 * @returns {String} New string with one or all matches replaced.
	 * @example
	 *
	 * // Regex search, using named backreferences in replacement string
	 * const name = XRegExp('(?<first>\\w+) (?<last>\\w+)');
	 * XRegExp.replace('John Smith', name, '$<last>, $<first>');
	 * // -> 'Smith, John'
	 *
	 * // Regex search, using named backreferences in replacement function
	 * XRegExp.replace('John Smith', name, (match) => `${match.last}, ${match.first}`);
	 * // -> 'Smith, John'
	 *
	 * // String search, with replace-all
	 * XRegExp.replace('RegExp builds RegExps', 'RegExp', 'XRegExp', 'all');
	 * // -> 'XRegExp builds XRegExps'
	 */
	export const replace = (str, search: RegExp | string, replacement, scope?: 'one' | 'all') =>
	{
		const isRegex = XRegExp.isRegExp(search);
		// @ts-ignore
		const global = (search.global && scope !== 'one') || scope === 'all';
		// @ts-ignore
		const cacheKey = ((global ? 'g' : '') + (search.sticky ? 'y' : '')) || 'noGY';
		let s2 = search;

		if (isRegex)
		{
			search[REGEX_DATA] = search[REGEX_DATA] || {};

			// Shares cached copies with `XRegExp.exec`/`match`. Since a copy is used, `search`'s
			// `lastIndex` isn't updated *during* replacement iterations
			s2 = search[REGEX_DATA][cacheKey] || (
				search[REGEX_DATA][cacheKey] = copyRegex(search, {
					addG: !!global,
					removeG: scope === 'one',
					isInternalOnly: true
				})
			);
		}
		else if (global)
		{
			s2 = new RegExp(XRegExp.escape(String(search)), 'g');
		}

		// Fixed `replace` required for named backreferences, etc.
		const result: string = fixed.replace.call(toObject(str), s2, replacement);

		// @ts-ignore
		if (isRegex && search.global)
		{
			// Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
			// @ts-ignore
			search.lastIndex = 0;
		}

		return result;
	};

	export interface IReplaceEach
	{
		0: RegExp | string,
		1: any,
		2?: 'all' | 'one',
	}

	/**
	 * Performs batch processing of string replacements. Used like `XRegExp.replace`, but accepts an
	 * array of replacement details. Later replacements operate on the output of earlier replacements.
	 * Replacement details are accepted as an array with a regex or string to search for, the
	 * replacement string or function, and an optional scope of 'one' or 'all'. Uses the XRegExp
	 * replacement text syntax, which supports named backreference properties via `${name}` or
	 * `$<name>`.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to search.
	 * @param {Array} replacements Array of replacement detail arrays.
	 * @returns {String} New string with all replacements.
	 * @example
	 *
	 * str = XRegExp.replaceEach(str, [
	 *   [XRegExp('(?<name>a)'), 'z${name}'],
	 *   [/b/gi, 'y'],
	 *   [/c/g, 'x', 'one'], // scope 'one' overrides /g
	 *   [/d/, 'w', 'all'],  // scope 'all' overrides lack of /g
	 *   ['e', 'v', 'all'],  // scope 'all' allows replace-all for strings
	 *   [/f/g, ($0) => $0.toUpperCase()]
	 * ]);
	 */
	export const replaceEach = (str, replacements: IReplaceEach[]): string =>
	{
		for (const r of replacements)
		{
			str = XRegExp.replace(str, r[0], r[1], r[2]);
		}

		return str;
	};

	/**
	 * Splits a string into an array of strings using a regex or string separator. Matches of the
	 * separator are not included in the result array. However, if `separator` is a regex that contains
	 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
	 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
	 * cross-browser.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to split.
	 * @param {RegExp|String} separator Regex or string to use for separating the string.
	 * @param {Number} [limit] Maximum number of items to include in the result array.
	 * @returns {Array} Array of substrings.
	 * @example
	 *
	 * // Basic use
	 * XRegExp.split('a b c', ' ');
	 * // -> ['a', 'b', 'c']
	 *
	 * // With limit
	 * XRegExp.split('a b c', ' ', 2);
	 * // -> ['a', 'b']
	 *
	 * // Backreferences in result array
	 * XRegExp.split('..word1..', /([a-z]+)(\d+)/i);
	 * // -> ['..', 'word', '1', '..']
	 */
	export const split = (str, separator: RegExp | string, limit?: number): string[] => fixed.split.call(toObject(str), separator, limit);

	/**
	 * Executes a regex search in a specified string. Returns `true` or `false`. Optional `pos` and
	 * `sticky` arguments specify the search start position, and whether the match must start at the
	 * specified position only. The `lastIndex` property of the provided regex is not used, but is
	 * updated for compatibility. Also fixes browser bugs compared to the native
	 * `RegExp.prototype.test` and can be used reliably cross-browser.
	 *
	 * @memberOf XRegExp
	 * @param {String} str String to search.
	 * @param {RegExp} regex Regex to search with.
	 * @param {Number} [pos=0] Zero-based index at which to start the search.
	 * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
	 *   only. The string `'sticky'` is accepted as an alternative to `true`.
	 * @returns {Boolean} Whether the regex matched the provided value.
	 * @example
	 *
	 * // Basic use
	 * XRegExp.test('abc', /c/); // -> true
	 *
	 * // With pos and sticky
	 * XRegExp.test('abc', /c/, 0, 'sticky'); // -> false
	 * XRegExp.test('abc', /c/, 2, 'sticky'); // -> true
	 */
	// Do this the easy way :-)
	export const test = (str, regex: RegExp, pos?: number, sticky?: boolean | string) => !!XRegExp.exec(str, regex, pos, sticky);

	/**
	 * Uninstalls optional features according to the specified options. All optional features start out
	 * uninstalled, so this is used to undo the actions of `XRegExp.install`.
	 *
	 * @memberOf XRegExp
	 * @param {Object|String} options Options object or string.
	 * @example
	 *
	 * // With an options object
	 * XRegExp.uninstall({
 *   // Disables support for astral code points in Unicode addons
 *   astral: true,
 *
 *   // Don't add named capture groups to the `groups` property of matches
 *   namespacing: true
 * });
	 *
	 * // With an options string
	 * XRegExp.uninstall('astral namespacing');
	 */
	export const uninstall = (options) =>
	{
		options = prepareOptions(options);

		if (features.astral && options.astral)
		{
			setAstral(false);
		}

		if (features.namespacing && options.namespacing)
		{
			setNamespacing(false);
		}
	};

	/**
	 * Returns an XRegExp object that is the union of the given patterns. Patterns can be provided as
	 * regex objects or strings. Metacharacters are escaped in patterns provided as strings.
	 * Backreferences in provided regex objects are automatically renumbered to work correctly within
	 * the larger combined pattern. Native flags used by provided regexes are ignored in favor of the
	 * `flags` argument.
	 *
	 * @memberOf XRegExp
	 * @param {Array} patterns Regexes and strings to combine.
	 * @param {String} [flags] Any combination of XRegExp flags.
	 * @param {Object} [options] Options object with optional properties:
	 *   - `conjunction` {String} Type of conjunction to use: 'or' (default) or 'none'.
	 * @returns {RegExp} Union of the provided regexes and strings.
	 * @example
	 *
	 * XRegExp.union(['a+b*c', /(dogs)\1/, /(cats)\1/], 'i');
	 * // -> /a\+b\*c|(dogs)\1|(cats)\2/i
	 *
	 * XRegExp.union([/man/, /bear/, /pig/], 'i', {conjunction: 'none'});
	 * // -> /manbearpig/i
	 */
	export const union = (patterns: Array<string | RegExp>, flags?: string, options?: {
		conjunction?: 'or' | 'none',
	}) =>
	{
		options = options || {};
		const conjunction = options.conjunction || 'or';
		let numCaptures = 0;
		let numPriorCaptures;
		let captureNames;

		function rewrite(match, paren, backref)
		{
			const name = captureNames[numCaptures - numPriorCaptures];

			// Capturing group
			if (paren)
			{
				++numCaptures;
				// If the current capture has a name, preserve the name
				if (name)
				{
					return `(?<${name}>`;
				}
				// Backreference
			}
			else if (backref)
			{
				// Rewrite the backreference
				return `\\${+backref + numPriorCaptures}`;
			}

			return match;
		}

		if (!(isType(patterns, 'Array') && patterns.length))
		{
			throw new TypeError('Must provide a nonempty array of patterns to merge');
		}

		const parts = /(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*\]/g;
		const output = [];
		for (const pattern of patterns)
		{
			if (XRegExp.isRegExp(pattern))
			{
				numPriorCaptures = numCaptures;
				captureNames = (pattern[REGEX_DATA] && pattern[REGEX_DATA].captureNames) || [];

				// Rewrite backreferences. Passing to XRegExp dies on octals and ensures patterns are
				// independently valid; helps keep this simple. Named captures are put back
				output.push(nativ.replace.call(XRegExp(pattern.source).source, parts, rewrite));
			}
			else
			{
				output.push(XRegExp.escape(pattern));
			}
		}

		const separator = conjunction === 'none' ? '' : '|';
		return XRegExp(output.join(separator), flags);
	};

}

// ==--------------------------==
// Built-in syntax/flag tokens
// ==--------------------------==

/*
 * Letter escapes that natively match literal characters: `\a`, `\A`, etc. These should be
 * SyntaxErrors but are allowed in web reality. XRegExp makes them errors for cross-browser
 * consistency and to reserve their syntax, but lets them be superseded by addons.
 */
XRegExp.addToken(
	/\\([ABCE-RTUVXYZaeg-mopqyz]|c(?![A-Za-z])|u(?![\dA-Fa-f]{4}|{[\dA-Fa-f]+})|x(?![\dA-Fa-f]{2}))/,
	(match, scope) =>
	{
		// \B is allowed in default scope only
		if (match[1] === 'B' && scope === defaultScope)
		{
			return match[0];
		}
		throw new SyntaxError(`Invalid escape ${match[0]}`);
	},
	{
		scope: 'all',
		leadChar: '\\'
	}
);

/*
 * Unicode code point escape with curly braces: `\u{N..}`. `N..` is any one or more digit
 * hexadecimal number from 0-10FFFF, and can include leading zeros. Requires the native ES6 `u` flag
 * to support code points greater than U+FFFF. Avoids converting code points above U+FFFF to
 * surrogate pairs (which could be done without flag `u`), since that could lead to broken behavior
 * if you follow a `\u{N..}` token that references a code point above U+FFFF with a quantifier, or
 * if you use the same in a character class.
 */
XRegExp.addToken(
	/\\u{([\dA-Fa-f]+)}/,
	(match, scope, flags) =>
	{
		const code = dec(match[1]);
		if (code > 0x10FFFF)
		{
			throw new SyntaxError(`Invalid Unicode code point ${match[0]}`);
		}
		if (code <= 0xFFFF)
		{
			// Converting to \uNNNN avoids needing to escape the literal character and keep it
			// separate from preceding tokens
			return `\\u${pad4(hex(code))}`;
		}
		// If `code` is between 0xFFFF and 0x10FFFF, require and defer to native handling
		if (hasNativeU && flags.includes('u'))
		{
			return match[0];
		}
		throw new SyntaxError('Cannot use Unicode code point above \\u{FFFF} without flag u');
	},
	{
		scope: 'all',
		leadChar: '\\'
	}
);

/*
 * Empty character class: `[]` or `[^]`. This fixes a critical cross-browser syntax inconsistency.
 * Unless this is standardized (per the ES spec), regex syntax can't be accurately parsed because
 * character class endings can't be determined.
 */
XRegExp.addToken(
	/\[(\^?)\]/,
	// For cross-browser compatibility with ES3, convert [] to \b\B and [^] to [\s\S].
	// (?!) should work like \b\B, but is unreliable in some versions of Firefox
	/* eslint-disable no-confusing-arrow */
	(match) => (match[1] ? '[\\s\\S]' : '\\b\\B'),
	/* eslint-enable no-confusing-arrow */
	{ leadChar: '[' }
);

/*
 * Comment pattern: `(?# )`. Inline comments are an alternative to the line comments allowed in
 * free-spacing mode (flag x).
 */
XRegExp.addToken(
	/\(\?#[^)]*\)/,
	getContextualTokenSeparator,
	{ leadChar: '(' }
);

/*
 * Whitespace and line comments, in free-spacing mode (aka extended mode, flag x) only.
 */
XRegExp.addToken(
	/\s+|#[^\n]*\n?/,
	getContextualTokenSeparator,
	{ flag: 'x' }
);

/*
 * Dot, in dotall mode (aka singleline mode, flag s) only.
 */
XRegExp.addToken(
	/\./,
	() => '[\\s\\S]',
	{
		flag: 's',
		leadChar: '.'
	}
);

/*
 * Named backreference: `\k<name>`. Backreference names can use the characters A-Z, a-z, 0-9, _,
 * and $ only. Also allows numbered backreferences as `\k<n>`.
 */
XRegExp.addToken(
	/\\k<([\w$]+)>/,
	function (match)
	{
		// Groups with the same name is an error, else would need `lastIndexOf`
		// @ts-ignore
		const index = isNaN(match[1]) ? (this.captureNames.indexOf(match[1]) + 1) : +match[1];
		const endIndex = match.index + match[0].length;
		if (!index || index > this.captureNames.length)
		{
			throw new SyntaxError(`Backreference to undefined group ${match[0]}`);
		}
		// Keep backreferences separate from subsequent literal numbers. This avoids e.g.
		// inadvertedly changing `(?<n>)\k<n>1` to `()\11`.
		return `\\${index}${
			// @ts-ignore
			endIndex === match.input.length || isNaN(match.input[endIndex]) ?
				'' : '(?:)'
			}`;
	},
	{ leadChar: '\\' }
);

/*
 * Numbered backreference or octal, plus any following digits: `\0`, `\11`, etc. Octals except `\0`
 * not followed by 0-9 and backreferences to unopened capture groups throw an error. Other matches
 * are returned unaltered. IE < 9 doesn't support backreferences above `\99` in regex syntax.
 */
XRegExp.addToken(
	/\\(\d+)/,
	function (match, scope)
	{
		if (
			!(
				scope === defaultScope &&
				/^[1-9]/.test(match[1]) &&
				+match[1] <= this.captureNames.length
			) &&
			match[1] !== '0'
		)
		{
			throw new SyntaxError(`Cannot use octal escape or backreference to undefined group ${match[0]}`);
		}
		return match[0];
	},
	{
		scope: 'all',
		leadChar: '\\'
	}
);

/*
 * Named capturing group; match the opening delimiter only: `(?<name>`. Capture names can use the
 * characters A-Z, a-z, 0-9, _, and $ only. Names can't be integers. Supports Python-style
 * `(?P<name>` as an alternate syntax to avoid issues in some older versions of Opera which natively
 * supported the Python-style syntax. Otherwise, XRegExp might treat numbered backreferences to
 * Python-style named capture as octals.
 */
XRegExp.addToken(
	/\(\?P?<([\w$]+)>/,
	function (match)
	{
		// Disallow bare integers as names because named backreferences are added to match arrays
		// and therefore numeric properties may lead to incorrect lookups
		// @ts-ignore
		if (!isNaN(match[1]))
		{
			throw new SyntaxError(`Cannot use integer as capture name ${match[0]}`);
		}
		if (!XRegExp.isInstalled('namespacing') && (match[1] === 'length' || match[1] === '__proto__'))
		{
			throw new SyntaxError(`Cannot use reserved word as capture name ${match[0]}`);
		}
		if (this.captureNames.includes(match[1]))
		{
			throw new SyntaxError(`Cannot use same name for multiple groups ${match[0]}`);
		}
		this.captureNames.push(match[1]);
		this.hasNamedCapture = true;
		return '(';
	},
	{ leadChar: '(' }
);

/*
 * Capturing group; match the opening parenthesis only. Required for support of named capturing
 * groups. Also adds explicit capture mode (flag n).
 */
XRegExp.addToken(
	/\((?!\?)/,
	function (match, scope, flags)
	{
		if (flags.includes('n'))
		{
			return '(?:';
		}
		this.captureNames.push(null);
		return '(';
	},
	{
		optionalFlags: 'n',
		leadChar: '('
	}
);

export default XRegExp;
