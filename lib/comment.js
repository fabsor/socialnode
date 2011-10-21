/**
 * @file Utility functions for storing, retrieving and querying on comments.
 */
var sys = require('sys');
var CommentModel = function(db) {
  this.db = db;
};

CommentModel.prototype.save = function(item, commentInserted) {
  console.dir(this.db);
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

exports.CommentModel = CommentModel;