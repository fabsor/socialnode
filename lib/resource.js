/**
 * @file Utility functions for storing, retrieving and querying on comments.
 */
var fs = require('fs');
var path = require('path');
var Validator = require('./validator').Validator;
var sanitize = require('validator').sanitize;
var ObjectID = require('mongodb').ObjectID;

/**
 * A Resource controller controls the storage of our resources.
 * @todo Set up the connection to the collection once instead of every
 * time we do something.
 */
var ResourceController = function(resource, db) {
  this.db = db;
  this.resource = resource;
};

ResourceController.prototype.save = function(item, resourceInserted) {
  this.db.collection(this.resource.name, function(err, collection) {
    if (item._id) {
      collection.update({ '_id': item._id }, item, function (error, docs) {
        resourceInserted(docs);
      });
    }
    else {
      collection.insert(item, function(docs) {
        resourceInserted(docs);
      });
    }
  });
};

ResourceController.prototype.delete = function(id, resourceDeleted) {
  this.db.collection(this.resource.name, function(err, collection) {
    collection.remove({ '_id' : id }, function(error, result) {
      if (error) {
        throw new error;
      }
      resourceDeleted(result);
    });
  });
};

ResourceController.prototype.index = function(options, resourceRetrieved) {
  if (typeof options == 'undefined') {
    options = {};
  }
  this.db.collection(this.resource.name, function(err, collection) {
    collection.find(options, function(err, cursor) {
      cursor.toArray(function(err, docs) {
        resourceRetrieved(docs);
      });
    });
  });
};

ResourceController.prototype.retrieve = function(id, resourceRetrieved) {
  id = new this.db.bson_serializer.ObjectID(id);
  this.db.collection(this.resource.name, function(err, collection) {
    // Find the collection.
    collection.find({
      '_id' : id
    }, function(err, cursor) {
      cursor.nextObject(function(err, doc) {
        resourceRetrieved(doc);
      });
    });
  });
};

var ResourceType = function(name, label, description, controller) {
  this.name = name;
  this.label = label;
  this.description = description;
  this.controller = this.controller;
}

ResourceType.prototype.getLabel = function() {
  return this.label;
}

ResourceType.prototype.getName = function() {
  return this.name;
}

ResourceType.prototype.getDescription = function() {
  return this.description;
}

ResourceType.prototype.getController = function() {
  return this.controller;
}

var renderResourceTypeForm = function (res, resourceType, tabs, errors) {
  parameters = { title: 'Create resource', resource: resourceType, errors: errors, tabs: tabs };
  for (name in parameters) {
    if (typeof parameters[name] == "undefined") {
      parameters[name] = {};
    }
  }
  res.render("resourceform.jade", parameters);
}

var validateResourceType = function (resourceType, isNew, validatedFn) {
  var errors = {};
  var valid = true;
  var validator = new Validator();
  // Filter xss and trim everything we got.
  for (var name in resourceType) {
    if (resourceType.hasOwnProperty(name)) {
      resourceType[name] = sanitize(resourceType[name]).xss().trim();
    }
  }
  validator.check(resourceType.name, 'You must enter a name', 'name').notEmpty();
  validator.check(resourceType.name, 'You must enter a label', 'label').notEmpty();
  if (!validator.getErrorCount() && isNew) {
    exports.loadResourceTypes(function (resourceTypes) {
      // Does the resource exist?
      if (typeof resourceTypes[resourceType.name] != "undefined") {
        errors['name'] = "There is a resource with that name already.",
        valid = false;
      }
      validatedFn(valid, errors);
    });
  }
  else {
    validatedFn(!validator.getErrorCount(), validator.getErrors());
  }
}

exports.loadResourceTypes = function(resourceTypesLoadedFn) {
  path.exists('config/resourceTypes.json', function(status) {
    if (status) {
      fs.readFile('config/resourceTypes.json', function(error, data) {
        if (error) {
          throw Error('Could not read resources file');
        }
        var resourceTypes = JSON.parse(data);
        resourceTypesLoadedFn(resourceTypes);
      });
    }
    else {
      // If the file wasn't created yet, it means we have no resources.
      // We can return an empty object.
      resourceTypesLoadedFn({});
    }
  });
}

exports.loadResourceType = function (name, resourceTypeLoadedFn) {
  exports.loadResourceTypes(function(resources) {
    if (typeof resources[name] == "object") {
      resourceTypeLoadedFn(resources[name]);
    }
    else {
      resourceTypeLoadedFn(false);
    }
  });
}

exports.saveResourceTypes = function(resources, resourceTypesSavedFn) {
  fs.writeFile('config/resourceTypes.json', JSON.stringify(resources), resourceTypesSavedFn);
}

exports.createTabs = function(resourceType) {
  tabs = [
    { url: "/admin/resource/:resourcetype", title: "Edit" },
    { url: "/admin/resource/:resourcetype/fields", title: "Fields" },
    { url: "/admin/resource/:resourcetype/endpoints", title: "Endpoints" },
    { url: "/admin/resource/:resourcetype/content", title: "Content" }
  ];
  for (i in tabs) {
    tabs[i].url = tabs[i].url.replace(":resourcetype", resourceType.name);
  }
  return tabs;
}

/**
 * Add comment-specific things to our application.
 */
exports.init = function (app) {
  var server = app.getServer();
  // Add fields if the module is listed as enabled.
  var fields = app.getModule('fields');
  var endpoints = app.getModule('endpoints');

  // @todo
  // Create a factory for our resource instances. It is unnecessary to
  // instantiate them every time we want to do something.
  function loadResourceType(req, res, next) {
    if (req.params.resourcetype) {
      exports.loadResourceType(req.params.resourcetype, function(resourceType) {
        if (resourceType) {
          req.resourceType = resourceType;
          var viewOptions = server.get('view options');
          server.settings['view options'].tabs = exports.createTabs(req.resourceType);
	  next();
        }
        else {
          next(new Error('Failed to load resource type ' + req.params.resourcetype));
        }
      });
    }
    else {
      next();
    }
  }

  function loadResource(req, res, next) {
    if (req.resourceType) {
      var controller = new ResourceController(req.resourceType, app.getConnection().db);
      controller.retrieve(req.params.resource, function(data) {
        req.resource = data;
        next();
      });
    }
    else {
      next(new Error('No resource type has been identified'));
    }
  }
  server.get('/admin/resources', function(req, res) {
    exports.loadResourceTypes(function (resources) {
      res.render('resources.jade', { title: "Resources", resources: resources });
    });
  });

  server.get('/admin/resources/create', function (req, res) {
    renderResourceTypeForm(res);
  });

  server.post('/admin/resources/create', function(req, res) {
    var resourceType = req.body;
    validateResourceType(resourceType, true, function(valid, errors) {
      if (!valid) {
        renderResourceTypeForm(res, resource, errors);
      }
      else {
        exports.loadResourceTypes(function(resourceTypes) {
          resourceTypes[resourceType.name] = resourceType;
          exports.saveResourceTypes(resourceTypes, function() {
            res.redirect('back');
          });
	});
      }
    });
  });
  server.get('/admin/resource/:resourcetype', loadResourceType, function (req, res, next) {
    renderResourceTypeForm(res, req.resourceType, exports.createTabs(req.resourceType));
  });
  server.post('/admin/resource/:resourcetype', loadResourceType, function (req, res, next) {
    var edit = req.body;
    var resourceType = req.resourceType;
    edit.name = resourceType.name;
    validateResource(edit, false, function(valid, errors) {
      if (!valid) {
        renderResourceTypeForm(res, resourceType, exports.createTabs(original));
      }
      else {
        exports.loadResourceTypes(function(resourceTypes) {
          resourceTypes[edit.name] = edit;
          exports.saveResourceTypes(resources, function() {
            res.redirect('/admin/resources');
          });
	});
      }
    });
  });
  server.get('/admin/resource/:resourcetype/add', loadResourceType, function(req, res) {
    if (fields) {
      fields.attachForm(app, req.resourceType.name, req.resourceType.label, {}, {}, function(template, data) {
        res.render(template, data);
      });
    }
  });
  server.post('/admin/resource/:resourcetype/add', loadResourceType, function(req, res) {
    var contentPath = '/admin/resource/' + req.resourceType.name + '/content';
    if (fields) {
      fields.validateResource(app, req.resourceType.name, req.body, function(valid, errors) {
        // Save the resource if it's valid.
        if (valid) {
          var controller = new ResourceController(req.resourceType, app.getConnection().db);
          controller.save(req.body, function() {
            res.redirect(contentPath);
          });
        }
        else {
          fields.attachForm(app, req.resourceType.name, req.resourceType.label, req.body, errors, function(template, data) {
            res.render(template, data);
          });
        }
      });
    }
  });
  server.get('/admin/resource/:resourcetype/edit/:resource', loadResourceType, loadResource, function(req, res) {
    if (fields) {
      fields.attachForm(app,
                        req.resourceType.name,
                        req.resourceType.label,
                        req.resource,
                        {},
                        function(template, data) {
        res.render(template, data);
      });
    }
  });
  server.post('/admin/resource/:resourcetype/edit/:resource', loadResourceType, loadResource, function(req, res) {
    var contentPath = '/admin/resource/' + req.resourceType.name + '/content';
    if (fields) {
      fields.validateResource(app, req.resourceType.name, req.body, function(valid, errors) {
        // Save the resource if it's valid.
        if (valid) {
          var controller = new ResourceController(req.resourceType, app.getConnection().db);
          req.body._id = req.resource._id;
          controller.save(req.body, function() {
            res.redirect(contentPath);
          });
        }
        else {
          fields.attachForm(app, req.resourceType.name, req.resourceType.label, req.body, errors, function(template, data) {
            res.render(template, data);
          });
        }
      });
    }
  });

  server.get('/admin/resource/:resourcetype/delete/:resource', loadResourceType, loadResource, function(req, res) {
    var contentPath = '/admin/resource/' + req.resourceType.name + '/content';
    res.render('endpointdelete.jade', { returnLink: contentPath });
  });

  server.post('/admin/resource/:resourcetype/delete/:resource', loadResourceType, loadResource, function(req, res) {
    var contentPath = '/admin/resource/' + req.resourceType.name + '/content';
    var resourceType = req.resourceType;
    var controller = new ResourceController(resourceType, app.getConnection().db);
    controller.delete(req.resource._id, function(docs) {
      res.redirect(contentPath);
    });
  });

  server.get('/admin/resource/:resourcetype/content', loadResourceType, function(req, res) {
    var resourceType = req.resourceType;
    var controller = new ResourceController(resourceType, app.getConnection().db);
    controller.index({}, function(data) {
      for (i in data) {
        data[i].id = data._id;
        data[i].editLink = '/admin/resource/' + resourceType.name + '/edit/' + data[i]._id;
        data[i].deleteLink = '/admin/resource/' + resourceType.name + '/delete/' + data[i]._id;
      }
      res.render('resourcecontent.jade', { resources: data });
    });
  });
  // @todo
  // Fix this, so that anything can attach itself.
  if (fields) {
    fields.attachFieldsAdmin(app, '/admin/resource/:resourcetype', loadResourceType);
  }
  if (endpoints) {
    endpoints.attachEndpointsAdmin(app, '/admin/resource/:resourcetype', loadResourceType);
  }
}