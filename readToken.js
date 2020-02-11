/* eslint-disable camelcase */
/* eslint-disable no-console */
const http = require('http');
const url = require('url');

const authenticatedCall = require('./authenticatedCall');

const DB = require('./db');

const { CLIENT_ID, CLIENT_SECRET } = require('./config');

const TOKEN_FILENAME = './token.json';
const SCOPE = ['playlist-read-private'];

// local
const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}/`;

// spotify
const HOSTNAME = 'https://accounts.spotify.com/';
const AUTHORIZE_URL = `${HOSTNAME}authorize`;
const API_TOKEN_URL = `${HOSTNAME}api/token`;

const authorizeURL = new URL(AUTHORIZE_URL);
authorizeURL.searchParams.set('response_type', 'code');
authorizeURL.searchParams.set('client_id', CLIENT_ID);
authorizeURL.searchParams.set('redirect_uri', REDIRECT_URI);
authorizeURL.searchParams.set('scope', SCOPE);

const tokenStore = new DB(TOKEN_FILENAME);

const getTokenAutomatically = async body => {
  const method = 'POST';
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const options = { method, headers: { Authorization: `Basic ${auth}` }, body };
  const token = await authenticatedCall(API_TOKEN_URL, options);
  if (body.refresh_token) {
    token.refresh_token = body.refresh_token;
  }
  token.expires_at = new Date().setSeconds(
    new Date().getSeconds() + token.expires_in,
  );
  tokenStore.set(token);
  return token;
};

const getTokenManually = () =>
  new Promise((resolve, reject) => {
    http
      .createServer(async (req, res) => {
        const { code } = url.parse(req.url, true).query;
        if (code) {
          try {
            const token = await getTokenAutomatically({
              code,
              grant_type: 'authorization_code',
              redirect_uri: REDIRECT_URI,
            });
            resolve(token);
          } catch (e) {
            reject(e);
          }
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('You may close this window.\n');
      })
      .listen(PORT);

    console.log(
      `Click here to authorise your user for an access token: ${authorizeURL.toString()}`,
    );
  });

const readToken = async () => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log(`
You need a CLIENT_ID and a CLIENT_SECRET in the config.js.
Go to https://developer.spotify.com/dashboard/applications.
After creating, add http://localhost:8888/ as a callback URL.`);
    return null;
  }

  const token = tokenStore.get();
  const { access_token, expires_at, refresh_token } = token;
  if (!access_token) {
    return await getTokenManually();
  }
  if (new Date(expires_at) > new Date()) {
    return token;
  }
  return await getTokenAutomatically({
    refresh_token,
    grant_type: 'refresh_token',
  });
};

module.exports = readToken;
