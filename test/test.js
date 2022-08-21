/* global suite test */

const validation = require('./validation_test').validation;
const sanitization = require('./sanitization_test').sanitization;
const generator = require('./generator_test').generator;

// testing issues with shims
Array.prototype.TMP = function () { };

suite('Validation', validation);
suite('Sanitization', sanitization);
suite('Generator', generator);
