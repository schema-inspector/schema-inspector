Schema-Inspector V2
-------------------

Use only one schema to sanitize and validate your JSON objects. Use it for validating any API call in a sec.


```js
var schema = {
  type: "object",
  removeAdditional true, // defaults: true
  properties: {
    firstname: { type: "string", rules: ["trim", "title"], minLength: 1, maxLength: 30 },
    lastname: { type: "string", rules: ["trim", "title"], minLength: 1, maxLength: 30 },
    email: { type: "string", pattern: 'email', rules: 'lower' },
    foo: {
      type: 'object',
      properties: {
        foo: { type: "string" }
      }
    }
  },
  sanitize: function (schema, data, callback) {
    if (!data) { data = {}; }
    if (Array.isArray(data)) { data = data[0]; }
    callback(data);
  },
  validate: function (schema, data, callback) {
    if (...)
      return callback('Error with this key.');
    callback();
  }
};
```

Extending for POST (by example) :
```js
si.addRequired(schema, ['firstname', 'lastname', 'email', 'foo']); // '@' for root or not parameter
// Will add required: true to the firstname, lastname, email and both foo properties
```

```js
var validation = require('schema-inspector');
var data = { firstname: '  sebastien ', lastname: 'chopin' };
validation(schema, data, function (err, data) {
  if (err) return console.log(err);
  console.log(data);
});
```

For Express.js or use express-cool-api?
```js
var validation = require('schema-inspector');
validation.midd(schema)(req, res, next);
// or
validation.midd(schema, ['email', 'password'])(req, res, next); // required properties
```

- [ ] Error codes
- [ ] Messages (API?)
