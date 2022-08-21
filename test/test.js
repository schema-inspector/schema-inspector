/* global suite */
/* eslint no-extend-native: ["error", { "exceptions": ["Array"] }] */
// Disable space-before-function-paren for compatibility with VS Code default JS formatter.
/* eslint-disable space-before-function-paren */

const validation = require('./validation_test').validation;
const sanitization = require('./sanitization_test').sanitization;
const generator = require('./generator_test').generator;

// testing issues with shims
Array.prototype.TMP = function () { };

suite('Validation', validation);
suite('Sanitization', sanitization);
suite('Generator', generator);
