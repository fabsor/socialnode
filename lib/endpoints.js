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

/**
 * Get one endpoint.
 */
exports.getEndPoint = function (resourceType, endpointName, endpointLoadedFn) {
  exports.getEndPoints(resourceType, function(endpoints) {
    endpointLoadedFn(endpoints[endpointName]);
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
  var endpointform = {
    endpoints: {},
    new: { methods: {} }
  };
  function loadEndPoint(req, res) {
    var endpointName = req.params.endpoint ? req.params.endpoint : req.body.endpoint;
    if (!endpointName) {
      next(Error('No endpoint could be found'));
    }
    else {
      exports.getEndpoint(endpointName, function(endpoint) {
        endpoint ? next(endpoint) : next(Error('No endpoint could be found'));
      });
    }
  }
  function getEndPointFormState(endpoint) {
    if (endpoint) {
      endpointform.endpoints[endpoint] = endpointform.endpoints[endpoint] || { methods: {} };
      return endpointform.endpoints[endpoint];
    }
    return endpointform.new;
  }

  function renderEndPointForm (req, res, endpoint) {
    var state = getEndPointFormState(endpoint);
    var parameters = {'methodPlugins': app.getPlugins('method'), endpoint: endpoint, methods: state.methods};
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

  function renderMethodForm(req, res, plugin, method) {
    var params = {
      layout: !req.xhr,
      plugin: plugin,
      responsePlugins: app.getPlugins('response') || {},
      accessPlugins: app.getPlugins('access') || {},
      method: method,
    };
    var plugin = app.getPlugin('method', plugin);
    if (typeof plugin.settingsForm == 'function') {
      params.methodForm = plugin.settingsForm();
    }
    else {
      params.methodForm = false;
    }
    res.render('methodform.jade', params);
  }

  server.get(path + '/endpoints/add', loadResourceTypeFn, function (req, res) {
    renderEndPointForm(req, res);
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
        var params = {
          endpoint: req.body,
          errors: errors,
          methods: req.session.endpointform.methods
        }
        res.render('endpointform.jade', params);
      }
    });
  });

  server.post('/endpoints/methodform', function (req, res) {
    var plugin = req.body.plugin;
    if (!plugin) {
      throw new Error('No plugin defined');
    }
    else {
      renderMethodForm(req, res, plugin);
    }
  });

  server.get('/endpoints/method/edit/:method', function (req, res) {
    method = getEndPointFormState().methods[req.params.method];
    if (!method) {
      res.write("No such method", 403);
    }
    else {
      renderMethodForm(req, res, req.params.method, method);
    }
  });

  server.get('/endpoints/method/delete/:method', function (req, res) {
    delete getEndPointFormState().methods[req.params.method];
    res.JSON({ status: "ok" });
  });

  server.post('/endpoints/addmethod', function (req, res) {
    var plugin = req.body.plugin;
    var response = req.body.response;
    var valid = true;
    var errors = {};
    var pluginDef = app.getPlugin('method', plugin);

    if (!app.getPlugin('response', response)) {
      errors['response'] = 'The response plugin does not exist.';
      valid = false;
    }
    if (!pluginDef) {
      errors['plugin'] = 'The specified plugin does not exist.';
      valid = false;
    }
    // Return the errors.
    if (typeof pluginDef.settingsFormValidate == 'function') {
     plugin.settingsFormValidate(req.body, function (plugin_valid, errors) {
       respond(plugin_valid && valid, errors);
     });
    }
    else {
      respond(valid, errors);
    }

    function respond(valid, errors) {
      if (!valid) {
        res.json({ status: "failure", errors: errors }, 403);
      }
      else {
        getEndPointFormState().methods[plugin] = {
          response: response,
          label: pluginDef.label,
          editUrl: '/endpoints/method/edit/' + plugin,
          deleteUrl: '/endpoints/method/edit/' + plugin
        };
        res.json({ status: "ok" });
      }
    }
  });
  // Add methods
  app.getModule('resource').loadResourceTypes(function(resourceTypes) {
    for (var name in resourceTypes) {
      if (resourceTypes.hasOwnProperty(name)) {
        exports.getEndPoints(resourceTypes[name].name, function(endpoints) {
          for (var methodName in endpoints) {
            if (endpoints.hasOwnProperty(methodName)) {
              var plugin = app.getPlugin('method', endpoints[methodName].method);
              new plugin.class(endpoints[methodName], resourceTypes[name]).registerCallbacks(app.server);
            }
          }
        });
      }
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
  var plugins = { method: require('./plugins/methods').plugins, response: require('./plugins/responses').plugins };
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
