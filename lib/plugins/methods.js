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
var IndexMethod = function(endPoint, resourceType) {
  this.endPoint = endPoint;
  this.resourceType = resourceType;
  Method.call(this, endPoint);
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
IndexMethod.prototype.getPath = function () {
  return '';
}

IndexMethod.prototype.registerCallbacks = function (router) {
  router.get(this.endPoint.path, function(req, res) {
    var controller = new ResourceController(resourceType, app.getConnection().db);
    controller.index(function(items) {
      res.JSON(items);
    });
  });
}

exports.plugins = {};

exports.plugins.indexmethod = {
  type: "Method",
  label: "Index",
  class: IndexMethod
}
