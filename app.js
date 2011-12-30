/**
 * Module dependencies.
 */
var fs = require('fs');
var comment = require('./lib/comment');
var auth = require('./lib/auth');
var express = require('express');

// Get our configuration for the database. Once that is done, we can
// get to work on getting a connection.
fs.readFile("config/db.json", function(error, data) {
  if (error) {
    throw Error('Could not read json file');
  }
  var db_settings = JSON.parse(data);
  var db = require(db_settings.driver);
  // Create a connection to the database.
  db.createConnection('default', db_settings, configureApp);
});

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
    res.conditionalSend = conditionalSend;
    next();
  }
}

/**
 * Configure our express app.
 */
function configureApp(con) {
  var app = module.exports = express.createServer(),
  commentModel = new comment.CommentModel(con.db);
  // Configuration
  app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({ secret: "Some secret thing" }));
    app.use(express.methodOverride());
    app.use(conditionalResponse());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    // Set a default title.
    app.set('view options', { layout: true, title: 'Social node' });
  });
  app.configure('development', function () {
    app.use(express.errorHandler({
      dumpExceptions : true,
      showStack : true
    }));
  });
  app.configure('production', function() {
    app.use(express.errorHandler());
  });

  app.get('/comment/post', auth.authenticated, function(req, res) {
      res.render('commentform.jade', { title: "Create a new comment" });
  });

  app.get('/login', function (req, res) {
      res.render('loginform.jade', { services: auth.services, title: 'Log in'});
  });

  app.post('/login', auth.authenticate);

  app.post('/comment', function(req, res) {
      commentModel.save(req.body, function(result) {
	    res.redirect('back');
	});
    });

  app.get('/comment', function(req, res) {
    // Set a suggested template that we can return if we want HTML.
    commentModel.index({}, function(data) {
        console.log(data);
        res.conditionalSend(req, res, { comments: data }, 'comments.jade');
    });
  });
  app.get('/comment/:id', function(req, res) {
    commentModel.retrieve(req.params.id, function(comment) {
      res.conditionalSend(req, res, data, 'comment.jade')
    });
  });
  app.listen(3000);
  console.log('Express server listening on port %d in %s mode',
		app.address().port, app.settings.env);
}
