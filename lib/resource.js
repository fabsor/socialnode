/**
 * @file Utility functions for storing, retrieving and querying on comments.
 */
var fs = require('fs');
var path = require('path');
var sanitize = require('validator').sanitize;

function renderResourceForm(res, resource, errors) {
  if (typeof errors == "undefined") {
    errors = {};
  }
  if (typeof resource == "undefined") {
    resource = {};
  }
  res.render("resourceform.jade", { title: 'Create resource', resource: resource, errors: errors });
}

function validateResource(resource, isNew, validatedFn) {
  var errors = {};
  var valid = true;
  // Filter xss and trim everything we got.
  for (var name in resource) {
    resource[name] = sanitize(resource[name]).xss().trim();
  }
  if (typeof resource.name != 'string' || resource.name.length == 0) {
    errors['name'] = 'You must enter a name.';
    valid = false;
  }
  if (typeof resource.label != 'string' || resource.label.length == 0) {
    errors['label'] = 'You must enter a label.';
    valid = false;
  }
  if (valid && isNew) {
    exports.loadResources(function (resources) {
      // Does the resource exist?
      if (typeof resources[resource.name] != "undefined") {
        errors['name'] = "There is a resource with that name already.",
        valid = false;
      }
      validatedFn(valid, errors);
    });
  }
  else {
    validatedFn(valid, errors);
  }
}

exports.loadResources = function(resourcesLoadedFn) {
  path.exists('config/resources.json', function(status) {
    if (status) {
      fs.readFile('config/resources.json', function(error, data) {
        if (error) {
          throw Error('Could not read resources file');
        }
        var resources = JSON.parse(data);
        resourcesLoadedFn(resources);
      });
    }
    else {
      resourcesLoadedFn({});
    }
  });
}

exports.loadResource = function (name, resourceLoadedFn) {
  exports.loadResources(function(resources) {
    if (typeof resources[name] == "object") {
      resourceLoadedFn(resources[name]);
    }
    else {
      resourceLoadedFn(false);
    }
  });
}

exports.saveResources = function(resources, resourcesSavedFn) {
  fs.writeFile('config/resources.json', JSON.stringify(resources), resourcesSavedFn);
}

/**
 * Add comment-specific things to our application.
 */
exports.init = function (app) {
  var server = app.getServer();
  server.get('/admin/resources', function(req, res) {
    exports.loadResources(function (resources) {
	res.render('resources.jade', { title: "Resources", resources: resources });
    });
  });
  server.get('/admin/resources/create', function (req, res) {
    renderResourceForm(res);
  });
  server.post('/admin/resources/create', function(req, res) {
    var resource = req.body;
    validateResource(resource, true, function(valid, errors) {
      if (!valid) { 
        renderResourceForm(res, resource, errors);
      }
      else {
        exports.loadResources(function(resources) {
          resources[resource.name] = resource;
          exports.saveResources(resources, function() {
            res.redirect('back');            
          });
	});
      }
    });
  });
  server.get('/admin/resource/:resource', function (req, res, next) {
    var name = req.params.resource;
      exports.loadResource(name, function (resource) {
      if (typeof resource == "object") {
        renderResourceForm(res, resource);
      }
      else {
        res.write("Not found", 404);
      }
    });
  });
  server.post('/admin/resource/:resource', function (req, res, next) {
    var name = req.params.resource;
    var edit = req.body;
    exports.loadResource(name, function (original) {
      if (typeof original == "object") {
        // The resource name can't be changed.
        edit.name = name;
        validateResource(edit, false, function(valid, errors) {
          if (!valid) {
            renderResourceForm(res, edit, errors);
          }
          else {
            exports.loadResources(function(resources) {
              resources[edit.name] = edit;
              exports.saveResources(resources, function() {
                res.redirect('/admin/resources');
              });
	    });
          }
        });
      }
    });
  });
}