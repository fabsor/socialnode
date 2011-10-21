var mongo = require('mongodb'), Server = mongo.Server, Db = mongo.Db;

var connections = {};
var defaultIdentifier = null;
/**
 * Create a new connection. The created connections will be placed in the
 * connection pool, and can be reused.
 */
exports.createConnection = function(identifier, host, port, options,
    connectionEstablished) {
  if (identifier in connections) {
    return connections[identifier];
  }
  connection = {};
  connection.server = new Server(host, port, options);
  connection.db = new Db(identifier, connection.server);
  connection.db.open(function(err, db) {
    if (err) {
      throw err;
    }
    connections[identifier] = connection;
    // If we had no default identifier previously, let's set it to the provided
    // one here.
    if (defaultIdentifier == null) {
      defaultIdentifier = identifier;
    }
    connectionEstablished(connection);
  });
  return connection;
};

exports.closeConnection = function(identifier) {

};

exports.setDefaultIdentifier = function(identifier) {
  if (identifier in connections) {
    defaultIdentifier = identifier;
  }
};

exports.getConnection = function(identifier) {
  if (typeof identifier == 'string') {
    if (identifier in connections) {
      return connections[identifier];
    }
  }
  ;
  if (defaultIdentifier in connections) {
    return connections[defaultIdentifier];
  }
  ;
  return false;
};
