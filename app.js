/**
 * Module dependencies.
 */
var fs = require('fs');
var express = require('express');

/**
 * This is our main class. It mainly encapsulates things and keeps
 * track of events that fire.
 */
var App = function() {
  this.listeners = {};
  this.modules = {};
  this.bootstrapSteps = {
    "config/db.json": bootstrapDB,   
    "config/modules.json": loadModules 
  };
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
      app.bootstrapStepDone("config/db.json");
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
      }
    }
    app.bootstrapStepDone("config/modules.json");
  }

  /**
   * Configure our express app.
   */
  this.configureApp = function (con) {
    this.server = express.createServer();
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
      server.use(express.static(__dirname + '/public'));
      // Set a default title.
      server.set('view options', { layout: true, title: 'Social node' });
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

/**
 * Initiate the bootstrap. This is executed in parallel.
 */
App.prototype.bootstrap = function () {
  for (var name in this.bootstrapSteps) {
    fs.readFile(name, this.bootstrapSteps[name]);
  }
}

/**
 * Add a step to the bootstrap process. This only works in the initial
 * phase of the application, if you don't force a bootstrap process to
 * run again.
 */
App.prototype.addBootstrapStep = function (file, fn) {
  this.bootstrapSteps[file] = fn;
}

/**
 * Notify the application that another step is done.
 */
App.prototype.bootstrapStepDone = function(step) {
  delete this.bootstrapSteps[step];
  // We are ready to start the application if all the configuratin has been loaded.
  if (Object.keys(this.bootstrapSteps).length == 0) {
    this.configureApp();
  }
}

/**
 * Get a module object.
 */
App.prototype.getModule = function (module) {
  return this.modules[name];
}

/**
 * Get a database connection.
 */
App.prototype.getConnection = function () {
  console.log(this.con);
  return this.con;
}

/**
 * Get our server.
 */
App.prototype.getServer = function () {
  return this.server;
}

App.prototype.addEventListener = function (event, fn) {
  if (typeof this.events[event] != "object") {
    this.events[event] = [];
  }
  this.events["event"].append(fn);
}

var app = new App();
app.bootstrap();