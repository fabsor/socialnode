var fs = require('fs');
var Validator = require('./validator').Validator;
var path = require('path');
var PathRouter = require('./pathrouter').PathRouter;

var EndPoint = function (app, resourceType, path, name) {
  this.app = app;
  this.resourceType = resourceType;
  this.methods = {};
  this.middleware = [];
  this.path = path;
  this.name = name;
}

EndPoint.prototype.addPlugin = function (type, plugin) {

}

/**
 * Shorthand for plugins.
 */
EndPoint.getController = function() {
  return this.resourceType.getController();
}

EndPoint.prototype.registerCallbacks = function(app) {
  var server = app.server;
  var router = new PathRouter(this.path, this.server);
  for (var name in methods) {

  }
}

EndPoint.prototype.addAccessCheck = function(access) {

}

/**
 * Get all endpoints for a particular resource.
 */
exports.getEndPoints = function (resourceType, endpointsLoadedFn) {
  var resourcePath = 'config/endpoints/:resourcetype.json'.replace(':resourcetype', resourceType);
  path.exists(resourcePath, function (status) {
    if (status) {
      fs.readFile(resourcePath, function(error, data) {
        if (error) {
          throw Error('Could not read field definition file');
        }
        var endpoints = JSON.parse(data);
        endpointsLoadedFn(endpoints);
      });
    }
    else {
      endpointsLoadedFn({});
    }
  });
}

exports.validateEndPoint = function(endpoint, endPointValidatedFn) {
  var validator = new Validator();
  validator.isPath = function() {
    if (!this.str.match(/[a-zA-z0-9\/]+/)) {
      return this.error(this.msg || 'Invalid path');
    }
    return this;
  }
  validator.check(endpoint.name, "The name can only contain numbers and strings", "label").isAlphanumeric();
  validator.check(endpoint.label, "The label must exist", "label").notEmpty();
  validator.check(endpoint.path, "The path must exist, and can only contain letters and /", "type").notEmpty().isPath();
  endPointValidatedFn(validator.getErrorCount() == 0, validator.getErrors());
}

/**
 * Save a field definition to a file.
 */
exports.saveEndPoint = function (resource, definition, endPointSavedFn) {
  exports.getEndPoints(resource, function (endpoints) {
    var resourcePath = 'config/endpoints/:resourcetype.json'.replace(':resourcetype', resource);
    endpoints[definition.name] = definition;
    fs.writeFile(resourcePath, JSON.stringify(endpoints), function(error) {
      if (error) {
        throw new Error('Could not save field definition file');
      }
      else {
        endPointSavedFn();
      }
    });
  });
}

exports.attachEndpointsAdmin = function(app, path, loadResourceTypeFn) {

  function renderEndPointForm (res, endpoint) {
    endpoint = endpoint || { methods: {} }
    var parameters = {'methodPlugins': app.getPlugins('method'), endpoint: endpoint};
    res.render('endpointform.jade', parameters);
  }

  var server = app.server;
  server.get(path + '/endpoints', loadResourceTypeFn, function (req, res) {
    var resourcePath = path.replace(':resourcetype', req.resourceType.name);
    exports.getEndPoints(req.resourceType.name, function(endpoints) {
      for (var name in endpoints) {
        if (endpoints.hasOwnProperty(name)) {
          endpoints[name].editUrl = resourcePath + '/endpoints/edit/' + name;
          endpoints[name].deleteUrl = resourcePath + '/endpoints/delete/' + name;
        }
      }
      res.render('endpoints.jade', { endpoints: endpoints });
    });
  });

  server.get(path + '/endpoints/add', loadResourceTypeFn, function (req, res) {
    renderEndPointForm(res);
  });

  server.post(path + '/endpoints/add', loadResourceTypeFn, function (req, res) {
    var endpointPath = path.replace(':resourcetype', req.resourceType.name) + '/endpoints';
    exports.validateEndPoint(req.body, function(valid, errors) {
      if (valid) {
        exports.saveEndPoint(req.resourceType.name, req.body, function () {
          res.redirect(endpointPath);
        });
      }
      else {
        res.render('endpointform.jade', { endpoint: req.body, errors: errors });
      }
    });
  });
  server.post('/endpoints/methodform', function (req, res) {
    var plugin = req.body.plugin;
    if (!plugin) {
      throw new Error('No plugin defined');
    }
    else {
      var params = {
        layout: !req.xhr,
        responsePlugins: app.getPlugins('response') || {},
        accessPlugins: app.getPlugins('access') || {}
      }
      var plugin = app.getPlugin('method', plugin);
      if (typeof plugin.settingsForm == 'function') {
        params.methodForm = plugin.settingsForm();
      }
      else {
        params.methodForm = false;
      }
      res.render('methodform.jade', params);
    }
  });
}

exports.boot = function(app) {
  // Add a new bootstrap step to make sure our confguration directory exists.
  app.addBootstrapStep(ensureConfigDirectory);
  function ensureConfigDirectory() {
    // Make sure our configuration directory exists.
    path.exists('config/endpoints', function(status) {
      if (!status) {
        fs.mkdir('config/endpoints', function (status) {
          if (status) {
            throw status;
          }
          else {
            app.bootstrapNext();
          }
        });
      }
      else {
        app.bootstrapNext();
      }
    });
  }
  // Add some nice plugins.
  var plugins = { method: require('./plugins/methods').plugins, response: require('./plugins/responses')}
  for (var type in plugins) {
    if (plugins.hasOwnProperty(type)) {
      for (var name in plugins[type]) {
        if (plugins[type].hasOwnProperty(name)) {
          app.addPlugin(type, name, plugins[type][name]);
        }
      }
    }
  }
}
