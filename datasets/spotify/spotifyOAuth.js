require('dotenv').config();  // Load environment variables from .env file

const express = require('express'); // Import the Express framework for building the server.
const app = express();
const session = require('express-session'); // Import express-session to manage user sessions.
const querystring = require('querystring'); // Import querystring for formatting and parsing URL query strings.
const axios = require('axios'); // Import axios for HTTP requests
const execSync = require('child_process').execSync;  // Import execSync for running system commands

const port = process.env.PORT || 3000; // Set the port number from the environment or default to 8888.
const client_id = process.env.SPOTIFY_CLIENT_ID; // Load the Spotify client ID from environment variables.
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Load the Spotify client secret from environment variables.

// Dynamically get the ngrok URL for the redirect URI
function getNgrokUrl() {
  try {
    const ngrokUrl = execSync('curl http://127.0.0.1:4040/api/tunnels').toString();
    const json = JSON.parse(ngrokUrl);
    return json.tunnels[0].public_url;  // Get the public ngrok URL
  } catch (error) {
    console.error('Error fetching ngrok URL:', error);
    return null;
  }
}

const ngrok_url = getNgrokUrl();
const redirect_uri = `${ngrok_url}/callback`;  // Append the ngrok URL with the callback endpoint

if (!ngrok_url) {
  console.error('ngrok URL could not be retrieved. Make sure ngrok is running.');
}

const refreshTokens = {};

app.use(session({
  secret: 'your-secret-key', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

app.get('/login', (req, res) => {
  if (!redirect_uri) {
    return res.send('ngrok URL not available yet. Please try again later.');
  }

  const state = generateRandomString(16); 
  const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private';
  req.session.state = state;

  res.redirect('https://accounts.spotify.com/authorize?' + 
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (state === null || state !== req.session.state) {
    res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
    return;
  }

  try {
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      })
    });

    const access_token = tokenResponse.data.access_token;
    const refresh_token = tokenResponse.data.refresh_token;

    refreshTokens[req.sessionID] = refresh_token;

    const userProfile = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    res.send(`
      <h1>Authorization successful!</h1>
      <p>Welcome, ${userProfile.data.display_name}!</p>
      <p>Your Spotify ID: ${userProfile.data.id}</p>
      <p>Your Email: ${userProfile.data.email}</p>
      <p>Access Token: ${access_token}</p>
      <p>Refresh Token: ${refresh_token}</p>
    `);
  } catch (error) {
    console.error('Error exchanging code for token or fetching user profile:', 
      (error.response && error.response.data) || error);
    res.send('Failed to exchange code for token or fetch user profile.');
  }
});

app.get('/refresh_token', async (req, res) => {
  const refresh_token = refreshTokens[req.sessionID];
  if (!refresh_token) {
    return res.send('No refresh token found for this session.');
  }

  try {
    const refreshResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      })
    });

    const new_access_token = refreshResponse.data.access_token;
    res.send(`New access token: ${new_access_token}`);

  } catch (error) {
    console.error('Error refreshing access token:', (error.response && error.response.data) || error);
    res.send('Failed to refresh access token.');
  }
});

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function refreshAccessToken(sessionID) {
  const refresh_token = refreshTokens[sessionID];
  if (!refresh_token) {
    console.error('No refresh token found for this session.');
    return;
  }

  try {
    const refreshResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      })
    });

    const new_access_token = refreshResponse.data.access_token;
    console.log('New access token:', new_access_token);

    return new_access_token;

  } catch (error) {
    console.error('Error refreshing access token:', error);
  }
}

app.get('/some-route', async (req, res) => {
  const new_access_token = await refreshAccessToken(req.sessionID);

  if (new_access_token) {
    try {
      const spotifyResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${new_access_token}`
        }
      });

      res.send(spotifyResponse.data);
    } catch (error) {
      console.error('Error fetching data with new access token:', error.response ? error.response.data : error);
      res.send('Failed to fetch data from Spotify.');
    }
  } else {
    res.send('Failed to refresh access token.');
  }
});
