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
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
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
    commentModel.index({}, function(comments) {
	    res.json(comments);
    });
  });

  app.get('/comment/:id', function(req, res) {
    commentModel.retrieve(req.params.id, function(comment) {
	    res.json(comment);
      });
  });
  app.listen(3000);
  console.log('Express server listening on port %d in %s mode',
		app.address().port, app.settings.env);
}
