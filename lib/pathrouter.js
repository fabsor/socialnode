/**
 * Handle registration of paths under a specific path.
 */
var PathRouter = function() {
  this.path = arguments[0];
  this.server = arguments[1];
  this.middleware = [];
  // Get all middleware that we want to register on all paths.
  for (var i = 2; i < arguments.length; i++) {
    if (typeof arguments[i] === 'function') {
      this.middleware.push(arguments[i]);
    }
  }
}

var httpMethods = ['get', 'post', 'put', 'delete'];
for (i in httpMethods) {
  PathRouter.prototype[httpMethods[i]] = function () {
    var path = arguments[0];
    var middleware = [];
    // Get all middleware that we want to register on all paths.
    for (var i = 1; i < arguments.length; i++) {
      if (typeof arguments[i] === 'function') {
        middleware.push(arguments[i]);
      }
    }
    this.server[httpMethods[i]](this.path + path, this.middleware, middleware);
  }
}

exports.PathRouter = PathRouter;