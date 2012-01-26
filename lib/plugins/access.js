/**
 * Response plugin base.
 */
var Response = function (settings) {
  this.settings = settings;
}

Response.prototype.render = function (res, data) {
  res.write('end of the line');
}

/**
 * Plugin for rendering JSON.
 */
var JSONResponse = function () {
  Renderer.call(this);
}

JSONResponse.prototype.render = function (res, data) {
  res.json(data);
}

JSONResponse.prototype = Object.create(Response.prototype);


exports.plugins = {};

exports.plugins.authAccess = {
  type: "access",
  label: "Access",
  fn: JSONResponse
}
