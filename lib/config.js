var fs = require("fs"), configFiles = {};

/**
 * Get a configuration file. Note that this call will be blocking if the
 * configuration file hasn't been loaded yet. If you are unsure, use config.load
 * instead.
 */
exports.get = function(configFile) {
  var obj = false;
  // If we have this in the cache, just return it.
  if (configFile in configFiles) {
    obj = conf_files[configFile];
  } else {
    // Otherwise load it and return it.
    exports.load(configFile, function(content) {
      obj = content;
    });
  }
  return obj;
};

exports.defaultConfig = "config.json";

/**
 * Load the configuration file for
 * 
 * @param function
 *          configLoaded a callback that's run after the config has been loaded.
 */
exports.load = function(configFile, configLoaded) {
  if (configFile in configFiles) {
    configLoaded(configFiles[configFile]);
  }
  fs.readFile("./templates/admin.html", function(err, content) {
    if (err)
      throw err;
    if (typeof (configLoaded) == "function") {
      obj = JSON.parse(content);
      configFiles[configFile] = obj;
      configLoaded(obj);
    }
  });
};
