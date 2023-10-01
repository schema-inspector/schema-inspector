/* global suite test */
// Disabling no-unused-expressions because we use Chai in tests.
/* eslint-disable no-unused-expressions */
/* eslint-disable comma-dangle */
// Disable space-before-function-paren for compatibility with VS Code default JS formatter.
/* eslint-disable space-before-function-paren */

const should = require('should');
const si = require('../');

// Produces a string with "n" of the char in a row. Used for creating
// long strings for tests. "c" is the char.
function nChar(n, c) {
  let str = '';
  for (let i = 0; i < n; i++) {
    str = `${str}${c}`;
  }
  return str;
}

exports.validation = function () {
  suite('email addresses', function () {
    const schema = {
      type: 'string',
      pattern: 'email',
    };

    suite('valid email addresses', function () {
      const candidates = [
        // Allow as few as one character in each part
        'a@b.c',
        // Allow many characters in each part
        `${nChar(100, 'a')}@${nChar(100, 'b')}.${nChar(100, 'c')}`,
        // Allow numeric non-alphabetic characters in each part, except the last
        // part
        '1@2.com',
        // Allow special character non-alphabetic characters in each part, except
        // the last part
        '!@!.com',
        // Allow a mixture of alphabetic, numeric, and special characters in
        // each part that allows non-alphabetic characters.
        'a1!@a1!.com',
      ];

      for (const candidate of candidates) {
        test(`candidate "${candidate}"`, function () {
          const result = si.validate(schema, candidate);

          result.should.be.an.Object;
          if (!result.valid) {
            throw new Error('candidate deemed invalid when it should have been deemed valid');
          }
        });
      }
    });

    suite('invalid email addresses', function () {
      const candidates = [
        // Disallow no characters in each part
        '@.',
        // Disallow no characters in the first part
        '@b.c',
        // Disallow no characters in the second part
        'a@.c',
        // Disallow missing the @ character between the first part and second
        // part
        'ab.c',
        // Disallow missing the . character between the second part and the
        // third part.
        'a@bc',
        // Disallow numeric characters in the third part
        'a@b.1',
        // Disallow special characters in the third part
        'a@b.!',
      ];

      for (const candidate of candidates) {
        test(`candidate "${candidate}"`, function () {
          const result = si.validate(schema, candidate);

          result.should.be.an.Object;
          if (result.valid) {
            throw new Error('candidate deemed valid when it should have been deemed invalid');
          }
        });
      }
    });
  });

  suite('schema #1 (Several types of test in the same inspection)', function () {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 4, maxLength: 12 },
        age: { type: 'number', gt: 0, lt: 100 },
        id: { type: 'string', exactLength: 8, pattern: /^A.{6}Z$/ },
        site1: { type: 'string', pattern: 'url' },
        stuff: {
          type: 'array',
          minLength: 2,
          maxLength: 8,
          items: {
            type: ['string', 'null', 'number'],
            minLength: 1
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        name: 'NikitaJS',
        age: 20,
        id: 'AbcdefgZ',
        site1: 'http://google.com',
        stuff: ['JavaScript', null, 1234]
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        name: 'Nik',
        age: 20,
        id: 'Abcdefgb',
        site1: 'http://localhost:1234',
        stuff: ['', null, 1234]
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(3);
      result.error[0].property.should.equal('@.name');
      result.error[1].property.should.equal('@.id');
      result.error[2].property.should.equal('@.stuff[0]');
    });

    test('candidate #3', function () {
      const candidate = {
        name: 'NikitaJS',
        age: 101,
        id: new Date(),
        site1: 'wat',
        stuff: []
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(4);
      result.error[0].property.should.equal('@.age');
      result.error[1].property.should.equal('@.id');
      result.error[2].property.should.equal('@.site1');
      result.error[3].property.should.equal('@.stuff');
    });

    test('candidate #4', function () {
      const candidate = {
        name: 'NikitaJS loves JavaScript but this string is too long',
        age: 20,
        id: 'aeeeeeeZ',
        site1: 'http://schema:inspector@schema-inspector.com',
        stuff: ['JavaScript', {}, []]
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(5);
      result.error[0].property.should.equal('@.name');
      result.error[1].property.should.equal('@.id');
      result.error[2].property.should.equal('@.stuff[1]');
      // @.stuff[2] appears twice because it infringes 2 rules
      // 1 - Bad type (array)
      // 2 - Too short length
      result.error[3].property.should.equal('@.stuff[2]');
      result.error[4].property.should.equal('@.stuff[2]');
    });
  }); // suite "schema #1"

  suite('schema #1.1 (Types tests)', function () {
    function F() { }
    const schema = {
      type: 'array',
      items: [
        { type: 'function' },
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
        { type: F },
      ]
    };

    test('candidate #1', function () {
      const candidate = [
        function () { },
        'Nikita',
        1234.1234,
        1234,
        new F()
      ];
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      function G() { }
      const candidate = [
        null,
        'Nikita',
        1234,
        1234.1234,
        new G()
      ];
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(3);
      result.error[0].property.should.equal('@[0]');
      result.error[1].property.should.equal('@[3]');
      result.error[2].property.should.equal('@[4]');
      result.error[2].message.should.equal('must be an instance of F, but is an instance of G');
    });
  }); // suite "schema #1.1"

  suite('schema #2 (deeply nested object inspection)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: {
          type: 'object',
          properties: {
            ipsum: {
              type: 'object',
              properties: {
                dolor: {
                  type: 'object',
                  properties: {
                    sit: {
                      type: 'object',
                      properties: {
                        amet: { type: 'any' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        lorem: { ipsum: { dolor: { sit: { amet: 'truc' } } } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        lorem: { ipsum: { dolor: { sit: { amet: new Date() } } } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = {
        lorem: { ipsum: { dolor: { sit: { amet: 1234 } } } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #4', function () {
      const candidate = {
        lorem: { ipsum: { dolor: { sit: { amet: /^regexp$/ } } } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #5', function () {
      const candidate = {
        lorem: { ipsum: { dolor: { sit: { amet: ['this', 'is', 'an', 'array'] } } } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #5', function () {
      const candidate = {
        lorem: { ipsum: { dolor: { sit: { amet: ['this', 'is', 'an', 'array'] } } } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #6', function () {
      const candidate = {
        lorem: { ipsum: { dolor: { sit: 0 } } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.lorem.ipsum.dolor.sit');
    });

    test('candidate #7', function () {
      const candidate = {
        lorem: { ipsum: { dolor: 0 } }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.lorem.ipsum.dolor');
    });

    test('candidate #8', function () {
      const candidate = {
        lorem: { ipsum: 0 }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.lorem.ipsum');
    });
  }); // suite "schema #2"

  suite('schema #3 (array inspection with an array of schema)', function () {
    const schema = {
      type: 'object',
      properties: {
        array: {
          type: 'array',
          items: [{
            type: 'object',
            properties: {
              thisIs: { type: 'string' }
            }
          }, {
            type: 'number'
          }, {
            type: 'object',
            optional: true,
            properties: {
              thisIs: { type: 'date' }
            }
          }]
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        array: [
          { thisIs: 'aString' },
          1234,
          { thisIs: new Date() }
        ]
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        array: [
          { thisIs: 'aString' },
          1234,
          { thisIs: new Date() },
          'This is another key'
        ]
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = {
        array: [
          { thisIs: 'aString' },
          'aString',
          { thisIs: 1234 }
        ]
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@.array[1]');
      result.error[1].property.should.equal('@.array[2].thisIs');
    });

    test('candidate #4', function () {
      const candidate = {
        array: [{}, 1234]
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.array[0].thisIs');
    });

    test('candidate #5', function () {
      const candidate = {
        array: [{ thisIs: 'anotherString' }]
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.array[1]');
    });
  }); // suite "schema #3"

  suite('schema #4 (array inspection with a hash of schema)', function () {
    const schema = {
      type: 'object',
      properties: {
        array: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              thisIs: { type: 'string', minLength: 4, maxLength: 10 }
            }
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        array: [
          { thisIs: 'first' },
          { thisIs: 'second' },
          { thisIs: 'third' }
        ]
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        array: [
          { thisIs: 'aString' },
          1234,
          { thisIs: new Date() }
        ]
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@.array[1]');
      result.error[1].property.should.equal('@.array[2].thisIs');
    });

    test('candidate #3', function () {
      const candidate = {
        array: [
          { thisIs: 'first' },
          {},
          { thisIs: 'third' },
          {},
          { thisIs: 'fifth' }
        ]
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@.array[1].thisIs');
      result.error[1].property.should.equal('@.array[3].thisIs');
    });

    test('candidate #4', function () {
      const candidate = {
        array: [
          { thisIs: 'first but tooooooo long' },
          { thisIs: 'second' },
          { thisIs: 'ooh' }
        ]
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@.array[0].thisIs');
      result.error[1].property.should.equal('@.array[2].thisIs');
    });

    test('candidate #5', function () {
      const candidate = {
        array: []
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });
  }); // suite "schema #4"

  suite('schema #5 (formats and regular expressions)', function () {
    const schema = {
      type: 'array',
      items: [
        { type: 'string', pattern: /^\d+$/ },
        { type: 'string', pattern: /^[a-z]+$/i },
        { type: 'string', pattern: /^_[a-zA-Z]+_$/ },
        { type: 'string', pattern: 'date-time' },
        { type: 'string', pattern: 'decimal' },
        { type: 'string', pattern: 'color' },
        { type: 'string', pattern: 'v4uuid' }
      ]
    };

    test('candidate #1', function () {
      const candidate = [
        '1234',
        'abcd',
        '_qwerty_',
        new Date().toISOString(),
        '3.1459',
        '#123456789ABCDEF0',
        '0e0fa279-e041-442e-a182-30c9db270894'
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = [
        '1234',
        'abcdE',
        '_QWErty_',
        '2012-01-26T17:00:00Z',
        '.1459',
        '#123456789abcdef0',
        'e5a2afe3-a398-4e49-8fe0-99dc8997119e'
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = [
        '1234e',
        'abcdE3',
        '_QWErty',
        '2012-01-26T17:00:00',
        '0.1459.',
        '#123456789abcdef0q',
        'c8ddb0d154eb-48e9-af48-9e59477c7895'
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(6);
      result.error[0].property.should.equal('@[0]');
      result.error[1].property.should.equal('@[1]');
      result.error[2].property.should.equal('@[2]');
      result.error[3].property.should.equal('@[4]');
      result.error[4].property.should.equal('@[5]');
      result.error[5].property.should.equal('@[6]');
    });

    test('candidate #4', function () {
      const candidate = [
        'e1234',
        '3abcdE',
        'QWErty_',
        '2012-01-26 17:00:00Z',
        '.0.1459',
        '12',
        'bc9ffc8e-2d5b'
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(7);
      result.error[0].property.should.equal('@[0]');
      result.error[1].property.should.equal('@[1]');
      result.error[2].property.should.equal('@[2]');
      result.error[3].property.should.equal('@[3]');
      result.error[4].property.should.equal('@[4]');
      result.error[5].property.should.equal('@[5]');
    });

    test('candidate #5', function () {
      const candidate = [
        '12e34',
        'abc3dE',
        '_QWE_rty_',
        '2012-01-26Z17:00:00ZT',
        '0,1459',
        '123#123',
        '@1da1602-#30c-$c33-&dbb-8d88*1796db3'
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(7);
      result.error[0].property.should.equal('@[0]');
      result.error[1].property.should.equal('@[1]');
      result.error[2].property.should.equal('@[2]');
      result.error[3].property.should.equal('@[3]');
      result.error[4].property.should.equal('@[4]');
      result.error[5].property.should.equal('@[5]');
      result.error[6].property.should.equal('@[6]');
    });
  }); // suite "schema #5"

  suite('schema #5.1 (formats date-time)', function () {
    const schema = {
      type: 'array',
      items: {
        type: 'string',
        pattern: 'date-time'
      }
    };

    test('candidate #1', function () {
      const candidate = [
        '2012-08-08T14:30:09.032+02:00',
        '2012-08-08T14:30:09+02:00',
        '2012-08-08T14:30:09.032Z',
        '2012-08-08T14:30:09Z',
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = [
        '2012-08-08T14:30:09.32+02:00',
        '2012-08-08T14:30:09+2:00',
        '2012-08-08T14:30:09.032',
        '2012-08-08 14:30:09',
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(3);
      result.error[0].property.should.equal('@[0]');
      result.error[1].property.should.equal('@[1]');
      result.error[2].property.should.equal('@[3]');
    });
  }); // suite "schema #5.1"

  suite('schema #5.2 (array of formats)', function () {
    const schema = {
      type: 'array',
      items: {
        type: 'string',
        pattern: ['date-time', 'color', 'alpha', /^OK /]
      }
    };

    test('candidate #1', function () {
      const candidate = [
        '2012-08-08T14:30:09.032+02:00',
        '#0f0bcd',
        'NikitaJS',
        'OK something'
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = [
        '2012-08-08T14:30:09.02+02:00',
        'OK#something'
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@[0]');
      result.error[1].property.should.equal('@[1]');
    });
  }); // suite "schema #5.2"

  suite('schema #6 (numbers inspection #1)', function () {
    const schema = {
      type: 'array',
      items: { type: 'integer', gte: 100, lte: 200, ne: 150 }
    };

    test('candidate #1', function () {
      const candidate = [
        100, 200, 125, 175
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = [
        100, 200, 99, 201, 150, 103.3
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(4);
      result.error[0].property.should.equal('@[2]');
      result.error[1].property.should.equal('@[3]');
      result.error[2].property.should.equal('@[4]');
      result.error[3].property.should.equal('@[5]');
    });
  }); // suite "schema #6"

  suite('schema #7 (numbers inspection #2)', function () {
    const schema = {
      type: 'array',
      items: { type: 'integer', gt: 100, lt: 200, ne: [125, 150, 175] }
    };

    test('candidate #1', function () {
      const candidate = [
        101, 199
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = [
        101, 199, 100, 200, 125, 150, 175
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(5);
      result.error[0].property.should.equal('@[2]');
      result.error[1].property.should.equal('@[3]');
      result.error[2].property.should.equal('@[4]');
      result.error[3].property.should.equal('@[5]');
      result.error[4].property.should.equal('@[6]');
    });
  }); // suite "schema #7"

  suite('schema #8 (numbers inspection #3)', function () {
    const schema = {
      type: 'array',
      items: { type: 'number', eq: [100, 125, 150, 200] }
    };

    test('candidate #1', function () {
      const candidate = [100, 125, 150, 200];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = [100, 125, 150, 200, 0, 25, 50];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(3);
      result.error[0].property.should.equal('@[4]');
      result.error[1].property.should.equal('@[5]');
      result.error[2].property.should.equal('@[6]');
    });

    test('candidate #3 | multipleOf option', function () {
      const multipleOfSchema = {
        type: 'object',
        properties: {
          arr: {
            type: 'array',
            items: {
              type: 'number',
              multipleOf: 10,
            },
          },
          num: {
            type: 'number',
            multipleOf: 2,
          },
        },
      };

      const validCandidates = [
        // Allows multiples
        {
          arr: [20, 40],
          num: 4,
        },
        // Also considers number itself to be a multiple
        {
          arr: [10, 20, 40],
          num: 2,
        },
        // Allows array with only one number
        {
          arr: [10],
          num: 2,
        },
        // Allows empty array
        {
          arr: [],
          num: 2,
        },
      ];

      for (const candidate of validCandidates) {
        const result = si.validate(multipleOfSchema, candidate);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
      }

      const invalidCandidates = [
        // All properties incorrect
        {
          arr: [15],
          num: 3,
        },
        // Just array property incorrect
        {
          arr: [15],
          num: 2,
        },
        // Just number property incorrect
        {
          arr: [10],
          num: 3,
        },
      ];

      for (const candidate of invalidCandidates) {
        const result = si.validate(multipleOfSchema, candidate);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
      }
    });
  }); // suite "schema #8"

  suite('schema #9 (uniqueness checking [uniquess === true])', function () {
    const schema = {
      type: 'array',
      items: { type: 'any' },
      uniqueness: true
    };

    test('candidate #1', function () {
      const candidate = [123, 234, 345, 456, 567];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = ['123', 123, '256', 256, false, 0, ''];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = [123, 234, 345, 456, 567, 123, 345];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@');
      result.error[1].property.should.equal('@');
    });

    test('candidate #4', function () {
      const candidate = ['123', null, '1234', '12', '123'];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@');
    });
  }); // suite "schema #9"

  suite('schema #10 (uniqueness checking [uniquess === false])', function () {
    const schema = {
      type: 'array',
      items: { type: 'any' },
      uniqueness: false
    };

    test('candidate #1', function () {
      const candidate = [123, 234, 345, 456, 567];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = ['123', 123, '256', 256, false, 0, ''];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = [123, 234, 345, 456, 567, 123, 345];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #4', function () {
      const candidate = ['123', null, '1234', '12', '123'];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });
  }); // suite "schema #10"

  suite('schema #11 (uniqueness checking [uniquess is not given])', function () {
    const schema = {
      type: 'array',
      items: { type: 'any' }
    };

    test('candidate #1', function () {
      const candidate = [123, 234, 345, 456, 567];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = ['123', 123, '256', 256, false, 0, ''];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = [123, 234, 345, 456, 567, 123, 345];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #4', function () {
      const candidate = ['123', null, '1234', '12', '123'];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });
  }); // suite "schema #11"

  suite('schema #12 (optionnal attribut testing)', function () {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        nickname: { type: 'string', optional: false },
        age: { type: 'number', optional: true }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        id: 1111,
        nickname: 'NikitaJS',
        age: 20
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        id: 1111,
        nickname: 'NikitaJS'
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = {
        age: 20
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@.id');
      result.error[1].property.should.equal('@.nickname');
    });
  }); // suite "schema #12"

  suite('schema #13 (field "error" testing)', function () {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
          gte: 10,
          lte: 20,
          error: 'Property id must be an integer between 10 and 20'
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        id: 15
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        id: 25
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.id');
      result.error[0].message.should.equal(schema.properties.id.error);
    });

    test('candidate #3', function () {
      const candidate = {
        id: 'NikitaJS'
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.id');
      result.error[0].message.should.equal(schema.properties.id.error);
    });
  }); // suite "schema #13"

  suite('schema #14 (field "alias" testing)', function () {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
          gte: 10,
          lte: 20,
          alias: 'ObjectId'
        },
        array: {
          optional: true,
          type: 'array',
          items: {
            type: 'string',
            alias: 'MyArray'
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        id: 25
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal(schema.properties.id.alias + ' (@.id)');
    });

    test('candidate #2', function () {
      const candidate = {
        id: 0,
        array: ['NikitaJS', 'Atinux', 1234]
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal(schema.properties.id.alias + ' (@.id)');
      result.error[1].property.should.equal(schema.properties.array.items.alias + ' (@.array[2])');
    });
  }); // suite "schema #14"

  suite('schema #15 (globing testing)', function () {
    const schema = {
      type: 'object',
      properties: {
        globString: {
          type: 'object',
          properties: {
            /* eslint-disable quote-props */
            '*': { type: 'string' }
            /* eslint-enable quote-props */
          }
        },
        globInteger: {
          type: 'object',
          properties: {
            /* eslint-disable quote-props */
            '*': { type: 'integer' }
            /* eslint-enable quote-props */
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        globString: {
          lorem: 'ipsum',
          dolor: 'sit amet'
        },
        globInteger: {
          seven: 7,
          seventy: 70,
          sevenHundredSeventySeven: 777
        }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        globString: {
        },
        globInteger: {
        }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #3', function () {
      const candidate = {
        globString: {
          lorem: 'ipsum',
          dolor: 77
        },
        globInteger: {
          seven: 7,
          seventy: 'sit amet',
          sevenHundredSeventySeven: 777
        }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@.globString.dolor');
      result.error[1].property.should.equal('@.globInteger.seventy');
    });
  }); // suite "schema #15"

  suite('schema #16 ("exec" field testing)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: {
          type: 'object',
          properties: {
            ipsum: {
              type: 'array',
              items: {
                type: ['string', 'number'],
                exec: function (schema, candidate) {
                  if (typeof candidate === 'string') {
                    if (candidate[0] === '_') {
                      this.report('should not begin with a "_"');
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        lorem: {
          ipsum: [
            1234,
            'thisIsAString'
          ]
        }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        lorem: {
          ipsum: [
            1234,
            'thisIsAString',
            '_thisIsAnInvalidString',
            'thisIsAString'
          ]
        }
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.lorem.ipsum[2]');
    });
  }); // suite "schema #16"

  suite('schema #16.1 ("exec" field with an array of function testing)', function () {
    const schema = {
      type: 'array',
      items: {
        type: ['string', 'number', 'date'],
        exec: [
          function (schema, candidat) {
            if (typeof candidat === 'number') {
              this.report('This is a number');
            }
          },
          function (schema, candidat) {
            if (typeof candidat === 'string') {
              this.report('This is a string');
            }
          }
        ]
      }
    };

    test('candidate #1', function () {
      const candidate = [
        'thisIsAString',
        1234,
        new Date()
      ];

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@[0]');
      result.error[1].property.should.equal('@[1]');
    });
  }); // suite "schema #16.1"

  suite('Schema #16.2 (Asynchronous call with exec "field" with synchrous function', function () {
    const schema = {
      type: 'array',
      items: {
        type: 'string',
        exec: function (schema, candidate) {
          if (typeof candidate === 'string' && candidate !== 'teub') {
            this.report('You must give a string equal to "teub".');
          }
        }
      }
    };
    test('candidate #1', function (done) {
      const candidate = [
        'teub',
        'teub',
        'teub'
      ];

      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(0);
        done();
      });
    });

    test('candidate #2', function (done) {
      const candidate = [
        'thisIsAString',
        'teub',
        'notValid',
        'teub',
        'thisOneNeither'
      ];

      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(3);
        result.error[0].property.should.equal('@[0]');
        result.error[1].property.should.equal('@[2]');
        result.error[2].property.should.equal('@[4]');
        done();
      });
    });

    test('candidate #3', function (done) {
      const candidate = [
        1234,
        'teub',
        new Date(),
        'teub',
        [12, 23]
      ];

      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(3);
        result.error[0].property.should.equal('@[0]');
        result.error[1].property.should.equal('@[2]');
        result.error[2].property.should.equal('@[4]');
        done();
      });
    });
  }); // suite "schema #16.2"

  suite('schema #16.2 ("exec" field testing with context)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: {
          type: 'object',
          properties: {
            ipsum: { type: 'string' }
          }
        },
        sit: {
          type: 'string',
          exec: function (schema, candidate) {
            if (candidate === this.origin.lorem.ipsum) {
              this.report('should not equal @.lorem.ipsum');
            }
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        lorem: {
          ipsum: 'dolor'
        },
        sit: 'amet'
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        lorem: {
          ipsum: 'dolor'
        },
        sit: 'dolor'
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@.sit');
    });
  }); // suite "schema #16.2"

  suite('schema #17 ("someKeys" field)', function () {
    const schema = {
      type: 'object',
      someKeys: ['lorem', 'ipsum', 'dolor', 'sit_amet'],
      properties: {
        '*': { type: 'any' }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        lorem: 12,
        ipsum: 34,
        thisIs: 'anotherKey'
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        thisIs: 'anotherKey'
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].property.should.equal('@');
    });

    test('candidate #3 with deep someKeys and no parent key given [valid]', function () {
      const schema = {
        properties: {
          parent: {
            someKeys: ['a', 'b'],
            optional: true,
          }
        }
      };
      const candidate = {};
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #4 with deep someKeys and no parent key given [fail]', function () {
      const schema = {
        properties: {
          parent: {
            someKeys: ['a', 'b'],
            optional: true,
          }
        }
      };
      const candidate = {
        parent: {}
      };
      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].message.should.be.equal('must have at least key "a" or "b"');
    });
  }); // suite "schema #17"

  suite('schema #18 ("strict" field)', function () {
    const schema = {
      type: 'object',
      strict: true,
      properties: {
        lorem: { type: 'number' },
        ipsum: { type: 'number' },
        dolor: { type: 'string' }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        lorem: 12,
        ipsum: 23,
        dolor: 'sit amet'
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      /* eslint-disable quote-props */
      const candidate = {
        lorem: 12,
        ipsum: 23,
        dolor: 'sit amet',
        'these': false,
        'keys': false,
        'must': false,
        'not': false,
        'be': false,
        'here': false
      };
      /* eslint-enable quote-props */

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      const keys = ['these', 'keys', 'must', 'not', 'be', 'here'].map(function (i) {
        return '"' + i + '"';
      }).join(', ');
      result.format().indexOf(keys).should.not.equal(-1);
    });

    test('candidate #3', function () {
      /* eslint-disable quote-props */
      const candidate = {
        lorem: 12,
        ipsum: 23,
        dolor: 'sit amet',
        'extra': false
      };
      /* eslint-enable quote-props */

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      const keys = ['extra'].map(function (i) {
        return '"' + i + '"';
      }).join(', ');
      result.format().indexOf(keys).should.not.equal(-1);
    });
  }); // suite "schema #18"

  suite('schema #18.1 ("strict" field, strict=false)', function () {
    const schema = {
      type: 'object',
      strict: false,
      properties: {
        lorem: { type: 'number ' },
        ipsum: { type: 'number ' },
        dolor: { type: 'string ' }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        lorem: 12,
        ipsum: 23,
        dolor: 'sit amet',
        extra: true
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });
  }); // suite "schema #18.1

  suite('schema #19 (Asynchronous call)', function () {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 4, maxLength: 12 },
        age: { type: 'number', gt: 0, lt: 100 },
        id: { type: 'string', exactLength: 8, pattern: /^A.{6}Z$/ },
        stuff: {
          type: 'array',
          minLength: 2,
          maxLength: 8,
          items: {
            type: ['string', 'null', 'number'],
            minLength: 1
          }
        }
      }
    };

    test('candidate #1', function (done) {
      const candidate = {
        name: 'NikitaJS',
        age: 20,
        id: 'AbcdefgZ',
        stuff: ['JavaScript', null, 1234]
      };
      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(0);
        done();
      });
    });

    test('candidate #2', function (done) {
      const candidate = {
        name: 'Nik',
        age: 20,
        id: 'Abcdefgb',
        stuff: ['', null, 1234]
      };
      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(3);
        result.error[0].property.should.equal('@.name');
        result.error[1].property.should.equal('@.id');
        result.error[2].property.should.equal('@.stuff[0]');
        done();
      });
    });
  }); // suite "schema #19"

  suite('schema #19.1 (Asynchronous call + asynchronous exec field)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: {
          type: 'object',
          properties: {
            ipsum: {
              type: 'string',
              exec: function (schema, post, callback) {
                const self = this;
                process.nextTick(function () {
                  if (post !== 'dolor sit amet') {
                    self.report('should equal dolor sit amet');
                  }
                  callback();
                });
              }
            }
          }
        },
        arr: {
          type: 'array',
          optional: true,
          exec: function (schema, post, callback) {
            if (!Array.isArray(post)) {
              return callback();
            }
            const self = this;
            process.nextTick(function () {
              if (post.length > 8) {
                return callback(new Error('Array length is too damn high!'));
              }
              if (post.length !== 5) {
                self.report('should have a length of 5');
              }
              callback();
            });
          }
        }
      }
    };

    test('candidate #1', function (done) {
      const candidate = {
        lorem: {
          ipsum: 'dolor sit amet'
        },
        arr: [12, 23, 34, 45, 56]
      };
      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(0);
        done();
      });
    });

    test('candidate #2', function (done) {
      const candidate = {
        lorem: {
          ipsum: 'wrong phrase'
        },
        arr: [12, 23, 34, 45]
      };
      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(2);
        result.error[0].property.should.equal('@.lorem.ipsum');
        result.error[1].property.should.equal('@.arr');
        done();
      });
    });

    test('candidate #3', function (done) {
      const candidate = {
        lorem: {
          ipsum: 'wrong phrase'
        },
        arr: [12, 23, 34, 45, 56, 67, 78, 89, 90, 123]
      };
      si.validate(schema, candidate, function (err, result) {
        should.exist(err);
        err.message.should.equal('Array length is too damn high!');
        done();
      });
    });
  }); // suite "schema #19.1"

  suite('schema #19.2 (Asynchronous call + globing)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: {
          type: 'object',
          properties: {
            /* eslint-disable quote-props */
            '*': { type: ['number', 'string'], gte: 10, minLength: 4 },
            consectetur: { type: 'string', optional: true, maxLength: 10 }
            /* eslint-enable quote-props */
          }
        }
      }
    };

    test('candidate #1', function (done) {
      const candidate = {
        lorem: {
          ipsum: 12,
          dolor: 34,
          sit: 'amet'
        }
      };

      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(0);
        done();
      });
    });

    test('candidate #2', function (done) {
      const candidate = {
        lorem: {
          ipsum: 5,
          dolor: 34,
          sit: 'am',
          consectetur: 'adipiscing elit'
        }
      };

      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(3);
        result.error[0].property.should.equal('@.lorem.ipsum');
        result.error[1].property.should.equal('@.lorem.sit');
        result.error[2].property.should.equal('@.lorem.consectetur');
        done();
      });
    });
  }); // suite "schema #19.2"

  suite('schema #19.3 (Asynchronous call++)', function () {
    const schema = {
      type: 'array',
      minLength: 1,
      items: [{
        type: ['string', 'object'],
        properties: {
          merchantId: {
            type: ['integer', 'string'],
            optional: true,
            alias: 'merchant Id'
          },
          id: {
            type: ['integer', 'string'],
            optional: true,
            alias: 'id'
          },
          mktpAlias: {
            type: 'string',
            optional: true,
            alias: 'marketplace alias'
          }
        }
      }]
    };
    test('object #1', function (done) {
      const candidate = ['thisIsAString'];
      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(0);
        done();
      });
    });
  }); // suite "schema #19.2"

  suite('schema #20 (custom schemas)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: { type: 'number', $divisibleBy: 4 },
        ipsum: { type: 'number', $divisibleBy: 5 }
      }
    };

    const custom = {
      divisibleBy: function (schema, candidate) {
        const dvb = schema.$divisibleBy;
        if (typeof dvb !== 'number' || typeof candidate !== 'number') {
          return;
        }
        const r = candidate / dvb;
        if ((r | 0) !== r) {
          this.report('should be divisible by ' + dvb);
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        lorem: 12,
        ipsum: 25,
      };

      const result = si.validate(schema, candidate, custom);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(true);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(0);
    });

    test('candidate #2', function () {
      const candidate = {
        lorem: 11,
        ipsum: 22,
      };

      const result = si.validate(schema, candidate, custom);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@.lorem');
      result.error[1].property.should.equal('@.ipsum');
    });
  }); // suite "schema #20"

  suite('schema #20.1 (custom schemas + asynchronous call)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: { type: 'number', $divisibleBy: 4 },
        ipsum: { type: 'number', $divisibleBy: 5 },
        dolor: { type: 'number', $divisibleBy: 0, optional: true }
      }
    };

    const custom = {
      divisibleBy: function (schema, candidate, callback) {
        const dvb = schema.$divisibleBy;
        if (typeof dvb !== 'number' || typeof candidate !== 'number') {
          return callback();
        }
        const self = this;
        process.nextTick(function () {
          if (dvb === 0) {
            return callback(new Error('Schema error: Divisor must not equal 0'));
          }
          const r = candidate / dvb;
          if ((r | 0) !== r) {
            self.report('should be divisible by ' + dvb);
          }
          callback();
        });
      }
    };

    test('candidate #1', function (done) {
      const candidate = {
        lorem: 12,
        ipsum: 25
      };

      si.validate(schema, candidate, custom, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(0);
        done();
      });
    });

    test('candidate #2', function (done) {
      const candidate = {
        lorem: 11,
        ipsum: 22,
      };

      si.validate(schema, candidate, custom, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(2);
        result.error[0].property.should.equal('@.lorem');
        result.error[1].property.should.equal('@.ipsum');
        done();
      });
    });

    test('candidate #3', function (done) {
      const candidate = {
        lorem: 11,
        ipsum: 4,
        dolor: 32
      };

      si.validate(schema, candidate, custom, function (err, result) {
        should.exist(err);
        err.message.should.equal('Schema error: Divisor must not equal 0');
        done();
      });
    });
  }); // suite "schema #20.1"

  suite('schema #20.2 (default custom schemas)', function () {
    const schema = {
      type: 'object',
      properties: {
        lorem: { type: 'number', $divisibleBy: 4 },
        ipsum: { type: 'number', $divisibleBy: 5 },
        dolor: { type: 'number', $divisibleBy: 0, optional: true }
      }
    };

    const custom = {
      divisibleBy: function (schema, candidate, callback) {
        const dvb = schema.$divisibleBy;
        if (typeof dvb !== 'number' || typeof candidate !== 'number') {
          return callback();
        }
        const self = this;
        process.nextTick(function () {
          if (dvb === 0) {
            return callback(new Error('Schema error: Divisor must not equal 0'));
          }
          const r = candidate / dvb;
          if ((r | 0) !== r) {
            self.report('should be divisible by ' + dvb);
          }
          callback();
        });
      }
    };

    si.Validation.extend(custom);

    test('candidate #1', function (done) {
      const candidate = {
        lorem: 12,
        ipsum: 25
      };

      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(true);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(0);
        done();
      });
    });

    test('candidate #2', function (done) {
      const candidate = {
        lorem: 11,
        ipsum: 22,
      };

      si.validate(schema, candidate, function (err, result) {
        should.not.exist(err);
        result.should.be.an.Object;
        result.should.have.property('valid').with.equal(false);
        result.should.have.property('error').with.be.an.instanceof(Array)
          .and.be.lengthOf(2);
        result.error[0].property.should.equal('@.lorem');
        result.error[1].property.should.equal('@.ipsum');
        done();
      });
    });

    test('candidate #3', function (done) {
      const candidate = {
        lorem: 11,
        ipsum: 4,
        dolor: 32
      };

      si.validate(schema, candidate, function (err, result) {
        should.exist(err);
        err.message.should.equal('Schema error: Divisor must not equal 0');
        done();
      });
    });

    test('Reseting default schema', function () {
      si.Validation.reset();
      si.Validation.custom.should.eql({});
    });
  }); // suite "schema #20.2"

  suite('schema #21 (field "code" testing)', function () {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
          gte: 10,
          lte: 20,
          code: 'id-format',
          exec: function (schema, post) {
            if (post === 15) {
              this.report('Test error in report', 'test-code');
            }
          }
        },
        array: {
          optional: true,
          type: 'array',
          items: {
            type: 'string',
            code: 'array-item-format'
          }
        }
      }
    };

    test('candidate #1', function () {
      const candidate = {
        id: 25
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(1);
      result.error[0].code.should.equal('id-format');
    });

    test('candidate #2', function () {
      const candidate = {
        id: 15,
        array: ['NikitaJS', 'Atinux', 1234]
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].code.should.equal('test-code');
      result.error[1].code.should.equal('array-item-format');
    });
  }); // suite "schema #14"

  suite('schema #22 (date with validDate: true)', function () {
    const schema = {
      type: 'object',
      items: { type: 'date', validDate: true }
    };

    test('candidate #1', function () {
      const candidate = {
        valid: new Date(),
        invalid: new Date('invalid'),
        nope: 'hello!'
      };

      const result = si.validate(schema, candidate);
      result.should.be.an.Object;
      result.should.have.property('valid').with.equal(false);
      result.should.have.property('error').with.be.an.instanceof(Array)
        .and.be.lengthOf(2);
      result.error[0].property.should.equal('@[invalid]');
      result.error[1].property.should.equal('@[nope]');
    });
  });
};
