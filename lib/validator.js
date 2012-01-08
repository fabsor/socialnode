// Change the validator prototype a tiny bit,
// so that we can refer to a machine name.

var Validator = function() {
  this.errorCount = 0;
}

Validator.prototype = require('validator').Validator.prototype;
Validator.prototype.check = function(str, fail_msg, name) {
  this.str = (str == null || (isNaN(str) && str.length == undefined)) ? '' : str;
  // Convert numbers to strings but keep arrays/objects
  if (typeof this.str == 'number') {
    this.str += '';
  }
  this.msg = fail_msg;
  // Lets use an object for storing errors, so we can get them more easily.
  this._errors = this._errors || {};
  this.current_name = name;
  return this;
}

// We also want to collect our errors.
Validator.prototype.error = function (msg) {
  this.errorCount++;
  this._errors[this.current_name] = this._errors[this.current_name] || [];
  this._errors[this.current_name].push(msg);
}

Validator.prototype.getErrorCount = function() {
  return this.errorCount;
}

Validator.prototype.getErrors = function () {
  return this._errors;
}

exports.Validator = Validator;
