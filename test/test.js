var validation = require('./validation_test').validation;
var sanitization = require('./sanitization_test').sanitization;
var generator = require('./generator_test').generator;

suite('Validation', validation);
suite('Sanitization', sanitization);
suite('Generator', generator);
