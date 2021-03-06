// this allows us access to all the auth0 API's and methods
import auth0 from 'auth0-js';
// import ApiCalls from '../utils/ApiCalls';
// varialbes used for storing session in memory
// eslint-disable-next-line
let _idToken = null;
let _accessToken = null;
let _scopes = null;
let _expiresAt = null;

// below in scope, the openid will give back the jwt: {
// iss Issuer
// sub Subject
// aud Audience
// exp Expiration Time
// nbf Not Before
// iat Issued At
// }

// when the below method authorize() is called, it will redirect the browser to the Auth0 login page

export default class Auth {
  // in theory we're passing in history should allow us to interact with React Router's history so Auth can perform redirects...
  constructor(history) {
    this.history = history;
    // this.userEmail = null;
    this.userProfile = null;
    this.requestedScopes = 'openid profile email read:current_user';
    // this initializes the necessary object, with its properties, below
    this.auth0 = new auth0.WebAuth({
      domain: process.env.REACT_APP_AUTH0_DOMAIN,
      clientID: process.env.REACT_APP_AUTH0_CLIENTID,
      redirectUri: process.env.REACT_APP_AUTH0_CALLBACK_URL,
      audience: process.env.REACT_APP_AUTH0_AUDIENCE,
      responseType: 'token id_token',
      scope: this.requestedScopes
    });
  }
  login = () => {
    this.auth0.authorize({
      redirectUri: process.env.REACT_APP_AUTH0_CALLBACK_URL
    });

    // this.history.push('/profile');
  };

  handleAuthentication = () => {
    this.auth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
        // console.log(this.history);
        // this.history.push('/');
      } else if (err) {
        alert(`Error: ${err.error}. Check the console for further details.`);
        console.log(err);
        // console.log(this.history);
        // this.history.push('/');
      }
    });
  };

  setSession = authResult => {
    // set the time that the access token will expire
    _expiresAt = authResult.expiresIn * 1000 + new Date().getTime();
    _scopes = authResult.scope || this.requestedScopes || '';
    _accessToken = authResult.accessToken;
    _idToken = authResult.idToken;
    this.scheduleTokenRenewal();
  };

  isAuthenticated() {
    return new Date().getTime() < _expiresAt;
  }

  // video 6.2 in pluralsight tutorial his logout dind't work so he added different code, but mine works for now... so this is note for reference...
  logout = () => {
    this.auth0.logout({
      returnTo: 'https://interxact3.herokuapp.com/',
      client_id: process.env.REACT_APP_AUTH0_CLIENTID
    });
    // _accessToken = null;
    // _idToken = null;
    // _expiresAt = null;
    // _scopes = null;
    // this.history.push('/');
  };

  getAccessToken = () => {
    if (!_accessToken) {
      throw new Error('No access token found.');
    }
    return _accessToken;
  };

  getProfile = cb => {
    if (this.userProfile) {
      return cb(this.userProfile);
    }
    // userInfo is an endpoint that is given to us via OAuth and is common on every identity provider
    this.auth0.client.userInfo(this.getAccessToken(), (err, profile) => {
      if (profile) {
        this.userProfile = profile;
        cb(profile, err);
      }
    });
  };

  // getEmail = cb => {
  //   if (this.userEmail) {
  //     return cb(this.userEmail);
  //   }
  //   this.auth0.client.userInfo(this.getAccessToken(), (err, email) => {
  //     if (email) {
  //       this.userEmail = email;
  //       cb(email, err);
  //     }
  //   });
  // };

  // this function looks in localStorage for scopes, if there are none then it defaults to an empty string, then splits on that string, THEN iterates over each scope and returns true if every one of the scopes passed into the function are found within the scopes that are inside localStorage
  userHasScopes(scopes) {
    const grantedScopes = (_scopes || '').split(' ');
    return scopes.every(scope => grantedScopes.includes(scope));
  }

  // checkSession is provided by auth0
  renewToken(cb) {
    this.auth0.checkSession({}, (err, result) => {
      if (err) {
        console.log(`Error: ${err.error} - ${err.error_description}.`);
      } else {
        this.setSession(result);
      }
      if (cb) {
        cb(err, result);
      }
    });
  }

  scheduleTokenRenewal() {
    const delay = _expiresAt - Date.now();
    if (delay > 0) {
      setTimeout(() => this.renewToken(), delay);
    }
  }
}
