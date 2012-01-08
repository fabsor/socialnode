/**
 * Module dependencies.
 */
var fs = require('fs');
var express = require('express');
var EventEmitter = require('events').EventEmitter;


var loadConfig = function (param) {
  fs.readFile(param.file, param.finished);
}

/**
 * This is our main class. It mainly encapsulates things and keeps
 * track of events that fire.
 */
var App = function() {
  EventEmitter.call(this);
  this.listeners = {};
  this.modules = {};
  this.objects = {};
  this.step = 0;
  this.plugins = {};
  this.bootstrapSteps = [
    { fn: loadConfig, parameters: { file: "config/db.json", finished: bootstrapDB }},
    { fn: loadConfig, parameters: { file: "config/modules.json", finished: loadModules }}
  ];
  var app = this;
  function bootstrapDB(error, data) {
    if (error) {
      throw Error('Could not read json file');
    }
    var db_settings = JSON.parse(data);
    var db = require(db_settings.driver);
    // Create a connection to the database.
    db.createConnection('default', db_settings, function(con) {
      app.con = con;
      app.bootstrapNext();
    });
  }

  function loadModules(error, data) {
    if (error) {
      throw Error('Could not read modules json file.');
    }
    modules = JSON.parse(data);
    for (var name in modules) {
      if (modules.hasOwnProperty(name)) {
        // Add the module to the list of objects.
        app.modules[name] = require(modules[name].path);
        // Add a namespace where the module can register things.
        app.objects[name] = {};
        // Let the new module do things upon inclusion.
        if (typeof app.modules[name].boot == "function") {
          app.modules[name].boot(app, app.modules[name]);
        }
      }
    }
    app.bootstrapNext();
  }

  /**
   * Configure our express app.
   */
  this.configureApp = function (con) {
    this.server = express.createServer();
    var app = this;
    var server = this.server;
    // Configuration
    server.configure(function () {
      server.set('views', __dirname + '/views');
      server.set('view engine', 'jade');
      server.use(express.bodyParser());
      server.use(express.cookieParser());
      server.use(express.session({ secret: "Some secret thing" }));
      server.use(express.methodOverride());
      server.use(server.router);
      app.emit('configureServer', server);
      server.use(express.static(__dirname + '/public'));
      // Set a default title.
      server.set('view options', { layout: true, title: 'Social node', tabs: {} });
    });
    server.configure('development', function () {
    server.use(express.errorHandler({
      dumpExceptions : true,
      showStack : true
      }));
    });
    server.configure('production', function() {
      server.use(express.errorHandler());
    });
    server.listen(3000);
    console.log('Server listening on port %d in %s mode',
		server.address().port, server.settings.env);
    // Let all modules do their thing.
    // @todo this should be an event instead.
    for (var name in this.modules) {
      if (typeof this.modules[name].init == "function") {
        this.modules[name].init(this);
      }
      else if (typeof this.modules[name].init == "array") {
        for (var i in this.modules[name].init) {
          this.modules[name].init[i](this);
        }
      }
    }
  };
}

App.prototype = Object.create(EventEmitter.prototype);

/**
 * Initiate the bootstrap. This is executed in parallel.
 */
App.prototype.bootstrap = function () {
  this.bootstrapNext();
}

/**
 * Add a step to the bootstrap process. This only works in the initial
 * phase of the application, if you don't force a bootstrap process to
 * run again.
 */
App.prototype.addBootstrapStep = function (fn, parameters) {
  this.bootstrapSteps.push({ fn: fn, parameters: parameters });
}

/**
 * Notify the application that another step is done.
 */
App.prototype.bootstrapNext = function() {
  var nextStep = this.bootstrapSteps.shift();
  if (typeof nextStep == "undefined") {
    this.configureApp();
  }
  else {
    nextStep.fn(nextStep.parameters);
  }
}

/**
 * Add a plugin to the application.
 */
App.prototype.addPlugin = function (type, name, definition) {
  this.plugins[type] = this.plugins[type] || {};
  this.plugins[type][name] = definition;
}

/**
 * Get a specific plugin.
 * @param string type the plugin type.
 * @param string name the plugin name.
 */
App.prototype.getPlugin = function (type, name) {
  return this.plugins[type][name];
}

/**
 * Get all plugins.
 * @param strin type (optional) Return plugins with this type.
 */
App.prototype.getPlugins = function (type) {
  if (type) {
    return this.plugins[type];
  }
  return this.plugins;
}

/**
 * Get a module.
 */
App.prototype.getModule = function (module) {
  return this.modules[module];
}

/**
 * Get a database connection.
 */
App.prototype.getConnection = function () {
  return this.con;
}

/**
 * Get our server.
 */
App.prototype.getServer = function () {
  return this.server;
}

/**
 * Add an object that should be accessible in the application.
 */
App.prototype.set = function (module, name, object) {
  this.objects[module][name] = object;
}

/**
 * Get an object that has been registered in the applicaiton.
 */
App.prototype.get = function (module, name) {
  return this.objects[module][name];
}

var app = new App();
app.bootstrap();
