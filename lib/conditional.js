/**
 * Determines if we should send JSON back.
 */
var JSONConditional = {}

JSONConditional.accept = function (req) {
  return req.accepts('application/json');
}

JSONConditional.send = function (res, data) {
  res.json(data);
}

/**
 * Determines if we should send HTML back.
 */
var HTMLConditional = {}

HTMLConditional.accept = function (req) {
  return req.accepts('html') && req.accepts('text/html');
}

HTMLConditional.send = function (res, data, options) {
  // Do we have a suggested template to use?
  if (typeof options == "object"  && options.template) {
    template = options.template;
  }
  else if (typeof options == "string") {
    template = options;
  }
  if (template) {
    res.render(template, data);
  }
  else {
    // Otherwise, just send the payload
    res.send(data);
  }
}

/**
 * Middleware definition for conditional responses.
 */
function conditionalResponse() {
  // A number of conditions that can apply for requests
  // that can be returned in different ways.
  var sendConditionals = [JSONConditional, HTMLConditional];

  /**
   * Return different things depending on the current configuration
   * and the request headers.
   */
  function conditionalSend(req, res, data, options) {
    for (var i in sendConditionals) {
        if (sendConditionals[i].accept(req)) {
            sendConditionals[i].send(res, data, options);
          break;
        }
    }
}

  return function conditionalResponse(req, res, next) {
    console.log("adding");
    res.conditionalSend = conditionalSend;
    next();
  }
}

exports.init = function (app) {
  app.getServer().use(conditionalResponse());
}
