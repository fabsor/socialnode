// Get the base class for methods.
var Method = function () {
  this.middleware = [];
}

Method.prototype.settingsForm = function() {
  return 'resources/methodform.jade';
}

Method.prototype.settingsFormValidate = function(settings) {

}

Method.prototype.registerCallbacks = function (router) {

}

Method.prototype.addMiddleware = function (middleware) {

}

/**
 * Method for doing REST Index.
 */
var IndexMethod = function(endPoint, settings) {
  Method.call(this, endPoint, settings);
}

IndexMethod.prototype = IndexMethod.prototype = Object.create(Method.prototype);

/**
 * Get the middleware associated with this method.
 */
IndexMethod.prototype.getMiddleware = function () {
  return this.settings.middleware;
}

/**
 * Get the path used for this method.
 */
IndexMethod.prototype.getPath = function() {
  return '';
}

/**
 * Respond to a callback.
 */
IndexMethod.prototype.respond = function (req, res) {
  controller.index({}, function(data) {
    for (i in data) {
      data[i].id = data._id;
    }
    this.settings.response;
  });
}

exports.plugins = {};

exports.plugins.indexmethod = {
  type: "Method",
  label: "Index",
  class: IndexMethod
}




