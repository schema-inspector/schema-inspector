var si = require('../');

si.Validation.extend({
	divisibleBy: function (schema, candidate) {
		var dvb = schema.$divisibleBy;
		if (candidate % dvb) {
			this.report('must be divisible by ' + dvb);
		}
	}
});

var schema = {
	type: 'array',
	items: {
		type: 'number', $divisibleBy: 5
	}
};

var obj = [ 0, 5, 10, 15, 17, 20];

// -----------------------------------------------------------------------------
var vdr = si.newValidation(schema);

vdr.validate(obj, function (err, r) {
	console.log(r);
	console.log(r.format());
});
