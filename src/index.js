"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xregexp_1 = require("./xregexp");
const build_1 = require("./addons/build");
const matchrecursive_1 = require("./addons/matchrecursive");
const unicode_base_1 = require("./addons/unicode-base");
const unicode_blocks_1 = require("./addons/unicode-blocks");
const unicode_categories_1 = require("./addons/unicode-categories");
const unicode_properties_1 = require("./addons/unicode-properties");
const unicode_scripts_1 = require("./addons/unicode-scripts");
build_1.default(xregexp_1.default);
matchrecursive_1.default(xregexp_1.default);
unicode_base_1.default(xregexp_1.default);
unicode_blocks_1.default(xregexp_1.default);
unicode_categories_1.default(xregexp_1.default);
unicode_properties_1.default(xregexp_1.default);
unicode_scripts_1.default(xregexp_1.default);
exports.default = xregexp_1.default;
