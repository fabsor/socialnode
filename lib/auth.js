/**
 * @file
 * Authentication stuff.
 */

var Auth = {

}

// An object with all supported services. Sometimes, easy is enough.
Auth.services = {
    test: {
      request_url: "http://test.oauth/oauth/request_token",
      access_url:  "http://test.oauth/oauth/access_token",
      authenticated: 'http://test.oauth/oauth/authenticated',
      authenticate: 'http://test.oauth/oauth/authorize',
      version: "1.0",
      consumer_key: '5GKd8t32YDcRchj4heuJ5cRojPUNVzef',
      consumer_secret: 'fqepH2kr9DcfsYfPA3W3TBNvAsSYKWgB',
      encryption: "HMAC-SHA1",
      label: "Test",
      name: "test"
    }
}

Auth.authenticated = function(req, res, next) {
    if (req.session.oauth) {
        req.session.oauth.verifier = req.query.oauth_verifier;
        var oauth = req.session.oauth;
        this.oa.getOAuthAccessToken(oauth.token, oauth.token_secret, oauth.verifier,
        function(error, oauth_access_token, oauth_access_token_secret, results) {
          if (error) {
            new Error(error);
          }
          console.log(results);
          next();
        });
    } else {
      res.send('Authentication required', 403);
    }
};

Auth.authenticate = function(req, res) {
    var sys = require('util');
    var OAuth = require('oauth').OAuth;
    // Which service do we want to connect to?
    var service = Auth.services[req.body.provider];
    this.oa = new OAuth(service.request_url,
                   service.access_url,
                   service.consumer_key, service.consumer_secret,
                   service.version, service.authenticated, service.encryption);
    req.session.oauth = oa;
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
    if (error) new Error(error.data);
      else {
        req.session.oauth.token = oauth_token;
        req.session.oauth.token_secret = oauth_token_secret;
        res.redirect(service.authenticate + '?oauth_token=' + oauth_token);
      }
    });
};

exports.Auth = module.exports = Auth;