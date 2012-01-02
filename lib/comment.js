/**
 * @file Utility functions for storing, retrieving and querying on comments.
 */
var CommentModel = function(db) {
  this.db = db;
};

CommentModel.prototype.save = function(item, commentInserted) {
  this.db.collection('comments', function(err, collection) {
    collection.insert(item, function(docs) {
      commentInserted(docs);
    });
  });
};

CommentModel.prototype.index = function(options, commentsRetrieved) {
  if (typeof options == 'undefined') {
    options = {};
  }
  this.db.collection('comments', function(err, collection) {
    collection.find(options, function(err, cursor) {
      cursor.toArray(function(err, docs) {
        commentsRetrieved(docs);
      });
    });
  });
};

CommentModel.prototype.retrieve = function(id, commentRetrieved) {
  id = new this.db.bson_serializer.ObjectID(id);
  this.db.collection('comments', function(err, collection) {
    // Find the collection.
    collection.find({
      '_id' : id
    }, function(err, cursor) {
      cursor.nextObject(function(err, doc) {
        commentRetrieved(doc);
      });
    });
  });
};

/**
 * Add comment-specific things to our application.
 */
function configureApp(app) {
  var commentModel = new CommentModel(app.getConnection().db);
  var server = app.getServer();
  server.get('/comment/post', function(req, res) {
    res.render('commentform.jade', { title: "Create a new comment" });
  });

  server.post('/comment', function(req, res) {
      commentModel.save(req.body, function(result) {
	    res.redirect('back');
	});
    });

  server.get('/comment', function(req, res) {
    // Set a suggested template that we can return if we want HTML.
    commentModel.index({}, function(data) {
        res.conditionalSend(req, res, { comments: data }, 'comments.jade');
    });
  });

  server.get('/comment/:id', function(req, res) {
    commentModel.retrieve(req.params.id, function(comment) {
      res.conditionalSend(req, res, data, 'comment.jade')
    });
  });
}

exports.init = configureApp;
exports.CommentModel = CommentModel;
