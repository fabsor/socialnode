var fs = require('fs');
var path = require('path');
var Validator = require('./validator').Validator;

/**
 * FieldType definition.
 */
var FieldType = function(resource, propertyName) {
  this.resource = resource;
  this.propertyName = propertyName;
}

FieldType.prototype.getName = function () {
  return "FieldType";
}

FieldType.prototype.getLabel = function () {
  return "Field type";
}

/**
 * Validate field data.
 */
FieldType.prototype.validate = function(field, fieldValidatedFn) {
  fieldValidatedFn(true);
}

/**
 * Get a settings form for this field.
 */
FieldType.prototype.settingsForm = function () {
  return false;
}

/**
 * Get a settings form for this field.
 */
FieldType.prototype.settingsFormValidate = function (field, validatedFn) {
  validatedFn(true, {});
}

/**
 * Render one or more form element for this field.
 */
FieldType.prototype.form = function(field) {
  return false;
}

/**
 * Perform operations after a field has been loaded.
 */
FieldType.prototype.onLoad = function(field) {

}

/**
 * Alter the data in the field before it gets saved.
 */
FieldType.prototype.preSave = function(data) {

}

/**
 * Perform operations after the data has been saved.
 */
FieldType.prototype.afterSave = function(data) {

}

/**
 * This wrapper class adds methods so that we don't manipulate the field data
 * directly.
 */
var FieldTypeCollection = function() {
  this.fieldTypes = {};
}

FieldTypeCollection.prototype.addFieldType = function (name, field_class) {
  this.fieldTypes[name] = field_class;
}

FieldTypeCollection.prototype.getFieldType = function(name) {
  return this.fieldTypes[name];
}

/**
 * Get options suitable for a select list.
 */
FieldTypeCollection.prototype.getOptions = function() {
  var fieldOptions = [];
  for (name in this.fieldTypes) {
    if (this.fieldTypes.hasOwnProperty(name)) {
      fieldOptions.push({ name: name, label: this.fieldTypes[name].getLabel() });
    }
  }
  return fieldOptions;
}


TextFieldType = function () {

}

TextFieldType.prototype = FieldType.prototype;

TextFieldType.prototype.settingsForm = function (field, settingsForm) {
  return 'fields/TextField/settings.jade';
}

TextFieldType.prototype.form = function() {
  return 'fields/TextField/form.jade';
}

TextFieldType.prototype.validate = function (field, value, validatedFn) {
  var validator = new Validator();
  validator.check(value).notEmpty();
  validatedFn(!validator.getErrorCount(), validator.getErrors());
}

TextFieldType.prototype.getName = function () {
  return "TextFieldType";
}

TextFieldType.prototype.getLabel = function () {
  return "Text field";
}

TextFieldType.prototype.settingsFormValidate = function (definition, validatedFn) {
  var validator = new Validator();
  validator.check(definition.maxlength, "The value must be numeric", "maxlength").isNumeric();
  validator.check(definition.minlength, "The value must be numeric", "minlength").isNumeric();
  validatedFn(!validator.getErrorCount(), validator.getErrors());
}

/**
 * Get all fields for a particular resource.
 */
exports.getFields = function (resource, fieldsLoadedFn) {
  var resourcePath = 'config/fields/:resourcetype.json'.replace(':resourcetype', resource);
  path.exists(resourcePath, function(status) {
    if (status) {
      fs.readFile(resourcePath, function(error, data) {
        if (error) {
          throw Error('Could not read field definition file');
        }
        var fields = JSON.parse(data);
        fieldsLoadedFn(fields);
      });
    }
    else {
      fieldsLoadedFn({});
    }
  });
}

/**
 * Save a field definition to a file.
 */
exports.saveField = function (resource, definition, fieldSavedFn) {
  exports.getFields(resource, function (fields) {
    var resourcePath = 'config/fields/:resourcetype.json'.replace(':resourcetype', resource);
    fields[definition.name] = definition;
    fs.writeFile(resourcePath, JSON.stringify(fields), function(error) {
      if (error) {
        throw new Error('Could not save field definition file');
      }
      else {
        fieldSavedFn();
      }
    });
  });
}

exports.validateResource = function (app, resourceType, resource, fieldsValidatedFn) {
  var fieldTypes = app.get('fields', 'FieldTypeCollection');
  exports.getFields(resourceType, function (fields) {
    var resourceErrors = {};
    var fieldKeys = [];
    for (var name in fields) {
      if (fields.hasOwnProperty(name)) {
        fieldKeys.push(name);
      }
    }
    var resourceValid = true;
    for (var name in fields) {
      if (fields.hasOwnProperty(name)) {
        var fieldType = fieldTypes.getFieldType(fields[name].type);
        fieldType.validate(fields[name], resource[name], function(valid, errors) {
          if (!valid) {
            resourceErrors[name] = errors;
            resourceValid = false;
          }
          fieldKeys.shift();
          if (!fieldKeys.length) {
            fieldsValidatedFn(resourceValid, resourceErrors);
          }
        });
      }
    }
  });
}

exports.validateField = function(fieldType, field, fieldValidatedFn) {
  var validator = new Validator();
  validator.check(field.name, "The name can only contain numbers and strings", "name").isAlphanumeric();
  validator.check(field.label, "The label must exist", "label").notEmpty();
  validator.check(field.type, "The field type must be set.", "type").notEmpty();
  if (!validator.getErrorCount()) {
    fieldType.settingsFormValidate(field, function (valid, errors) {
      fieldValidatedFn(valid, errors);
    });
  }
  else {
    fieldValidatedFn(validator.getErrorCount() == 0, validator.getErrors());
  }
}

exports.loadField = function (resource, name, fieldLoadedFn) {
  exports.getFields(resource, function (fields) {
    fieldLoadedFn(fields[name]);
  });
}

exports.deleteField = function (resource, name, fieldRemovedFn) {
  var resourcePath = 'config/fields/:resourcetype.json'.replace(':resourcetype', resource);
  exports.getFields(resource, function (fields) {
    delete fields[name];
    fs.writeFile(resourcePath, JSON.stringify(fields), function(error) {
      if (error) {
        throw new Error('Could not save field definition file');
      }
      else {
        fieldRemovedFn();
      }
    });
  });
}

exports.attachForm = function(app, resourceType, resourceLabel, resource, errors, attachedFn) {
  var fieldTypes = app.get('fields', 'FieldTypeCollection');
  exports.getFields(resourceType, function(fields) {
    var fieldForms = [];
    for (var name in fields) {
      if (fields.hasOwnProperty(name)) {
        var field = {};
        field.field = fields[name];
        var fieldType = fieldTypes.getFieldType([fields[name].type]);
        field.template = fieldType.form(field);
        field.value = resource[name];
        field.errors = errors[name];
        fieldForms.push(field);
      }
    }
    attachedFn('fields/resourceform.jade', { label: resourceLabel, fields: fieldForms });
  });
}

/**
 * Attach fields administration to a particular path.
 */
exports.attachFieldsAdmin = function (app, path, loadResourceTypeFn) {
  var server = app.server;
  // Retrieve our own namespace. This is where we are going to initialize our fields.
  var fieldTypes = app.get('fields', 'FieldTypeCollection');

  /**
   * Load a field.
   */
  function loadFieldType(req, res, next) {
    if (req.params.fieldtype) {
      var fieldType = fieldTypes.getFieldType(req.params.fieldtype);
    }
    else if (req.field.type) {
      var fieldType = fieldTypes.getFieldType(req.field.type);
    }
    if (fieldType) {
      req.fieldType = fieldType;
      next();
    }
    else {
      next(new Error('Could not find field type'));
    }
  }

  function loadField(req, res, next) {
    exports.loadField(req.resourceType.name, req.params.field, function (field) {
      if (field) {
        req.field = field;
        console.log(field);
        next();
      }
      else {
        next(new Error('Could not find field.'));
      }
    });
  }

  function renderFieldForm(res, fieldType,  field, errors) {
    if (typeof errors == "undefined") {
      errors = {};
    }
    // Get the settings form for this field.
    var fieldForm = fieldType.settingsForm();
    res.render('fields/fieldform.jade', { fieldForm: fieldForm, field: field, errors: errors });
  }

  server.get(path + '/fields', loadResourceTypeFn, function (req, res) {
    var resourceType = req.resourceType;
    exports.getFields(resourceType.name, function (fields) {
      resource = req.resource;
      var resourcePath = path.replace(':resourcetype', resourceType.name);
      for (name in fields) {
        if (fields.hasOwnProperty(name)) {
          fields[name].editUrl = resourcePath + '/fields/edit/' + name;
          fields[name].deleteUrl = resourcePath + '/fields/delete/' + name;
        }
      }
      res.render('fields/overview.jade', {
        fields: fields,
        fieldOptions: fieldTypes.getOptions(),
        newFieldPath: path.replace(':resourcetype', resourceType.name) + '/fields/add'
      });
    });
  });

  server.get(path + '/fields/add/:fieldtype', loadResourceTypeFn, loadFieldType, function (req, res) {
    renderFieldForm(res, req.fieldType, {});
  });

  server.post(path + '/fields/add/:fieldtype', loadResourceTypeFn, loadFieldType, function(req, res) {
    var definition = req.body;
    var resourceType = req.resourceType;
    var fieldType = req.fieldType;
    var overviewPath = path.replace(':resourcetype', resourceType.name) + '/fields';
    definition.type = req.fieldType.getName();
    exports.validateField(fieldType, definition, function(valid, errors) {
      if (valid) {
        exports.saveField(resourceType.name, definition, function() {
          res.redirect(overviewPath);
        });
      }
      else {
        renderFieldForm(res, req.fieldType, definition, errors);
      }
    });
  });

  server.get(path + '/fields/edit/:field', loadResourceTypeFn, loadField, loadFieldType, function (req, res) {
    renderFieldForm(res, req.fieldType, req.field, {});
  });

  server.post(path + '/fields/edit/:field', loadResourceTypeFn, loadField, loadFieldType, function (req, res) {
    var definition = req.body;
    definition.name = req.field.name;
    definition.type = req.field.type;
    var overviewPath = path.replace(':resourcetype', req.resourceType.name) + '/fields';
    exports.validateField(req.fieldType, definition, function(valid, errors) {
      if (valid) {
        exports.saveField(req.resourceType.name, definition, function() {
          res.redirect(overviewPath);
        });
      }
      else {
        renderFieldForm(res, req.fieldType, definition, errors);
      }
    });
  });
  // Redirect to the proper add page.
  server.post(path + '/fields/add', loadResourceTypeFn, function (req,res) {
    var addPath = path.replace(':resourcetype', req.resourceType.name) + '/fields/add/';
    if (req.body.fieldtype) {
      res.redirect(addPath + req.body.fieldtype);
    }
    else {
      throw new Error("No field specified");
    }
  });
  server.get(path + '/fields/delete/:field', loadResourceTypeFn, loadField, loadFieldType, function (req, res) {
    var overviewPath = path.replace(':resourcetype', req.resource.name) + '/fields';
    res.render('fields/deleteform.jade', { returnLink: overviewPath });
  });
  server.post(path + '/fields/delete/:field', loadResourceTypeFn, loadField, loadFieldType, function (req, res) {
    var overviewPath = path.replace(':resourcetype', req.resource.name) + '/fields';
    exports.deleteField(req.resource.name, req.field.name, function() {
      res.redirect(overviewPath);
    });
  });
}

/**
 * Register functions inside of our application.
 */
exports.boot = function (app) {
  // Put a function to register field types in the app namespace, so that it can
  // be used by modules that are currently enabled.
  // @todo There are lot's of ways to do this, but this will at least
  // make sure that the fields loaded are exclusive to the app configuration.
  app.set('fields', 'FieldTypeCollection', new FieldTypeCollection());
}

exports.init = function(app) {
  var server = app.server;
  // Retrieve our own namespace. This is where we are going to initialize our fields.
  var fieldTypes = app.get('fields', 'FieldTypeCollection');
  fieldTypes.addFieldType('TextFieldType', new TextFieldType());
}
