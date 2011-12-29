/**
 * Module dependencies.
 */
var comment = require('./lib/comment');
var db = require('./lib/db');
var auth = require('./lib/auth');
var express = require('express');

// Create a connection to the database.
db.createConnection('default', 'localhost', 27017, {
    auto_reconnect: true
}, function (con) {
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
});
