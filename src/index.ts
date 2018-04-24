import _XRegExp from './xregexp';

import build from './addons/build';
import matchRecursive from './addons/matchrecursive';
import unicodeBase from './addons/unicode-base';
import unicodeBlocks from './addons/unicode-blocks';
import unicodeCategories from './addons/unicode-categories';
import unicodeProperties from './addons/unicode-properties';
import unicodeScripts from './addons/unicode-scripts';

export const XRegExp = unicodeBase(matchRecursive(build(_XRegExp)));

unicodeBlocks(_XRegExp);
unicodeCategories(_XRegExp);
unicodeProperties(_XRegExp);
unicodeScripts(_XRegExp);

export default XRegExp;
