require('dotenv').config();  // Load environment variables from .env file

const express = require('express'); // Import the Express framework for building the server.
const app = express();
const session = require('express-session'); // Import express-session to manage user sessions.
const querystring = require('querystring'); // Import querystring for formatting and parsing URL query strings.
const axios = require('axios'); // Import axios for HTTP requests

const port = process.env.PORT || 8888; // Set the port number from the environment or default to 8888.
const client_id = process.env.SPOTIFY_CLIENT_ID; // Load the Spotify client ID from environment variables.
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Load the Spotify client secret from environment variables.
const redirect_uri = 'https://3be3-24-90-216-63.ngrok-free.app/callback'; // Variable to hold the redirect URI once it's dynamically set by ngrok.

const refreshTokens = {};

app.use(session({ // Add session management middleware. The 'secret' key is used to sign the session cookie,
  secret: 'your-secret-key', 
  resave: false, // 'resave: false' avoids resaving unmodified sessions, and 'secure: false' is set for local development.
  saveUninitialized: true,
  cookie: { secure: false }   
})); 
// 'resave: false' avoids resaving unmodified sessions, and 'secure: false' is set for local development.
  
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
  });  

app.get('/login', (req, res) => {
  if (!redirect_uri) {
    return res.send('ngrok URL not available yet. Please try again later.'); // If ngrok hasn’t started, return an error message.
  }

  const state = generateRandomString(16); // Generate a random string for OAuth 'state' to prevent CSRF attacks.
  const scope = 'user-read-private user-read-email'; // Define the required OAuth permissions to access user data.

  req.session.state = state; // Save the generated 'state' in the session for later validation.

  res.redirect('https://accounts.spotify.com/authorize?' + 
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    })); // Redirect the user to Spotify's OAuth authorization page with the necessary parameters.
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null; // Extract the 'code' from the query string, which is sent by Spotify after user authorization.
  const state = req.query.state || null; // Extract the 'state' parameter from the query string for validation.

  if (state === null || state !== req.session.state) {
    res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
    return; // If the state doesn't match the session state, reject the request to prevent CSRF attacks.
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
    }); // Send a POST request to Spotify to exchange the authorization code for an access token.

    const access_token = tokenResponse.data.access_token;
    const refresh_token = tokenResponse.data.refresh_token; // Extract the access_token and refresh_token from the response.

    refreshTokens[req.sessionID] = refresh_token;

    const userProfile = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    }); // Use the access_token to fetch the user's profile from Spotify.

    res.send(`
      <h1>Authorization successful!</h1>
      <p>Welcome, ${userProfile.data.display_name}!</p>
      <p>Your Spotify ID: ${userProfile.data.id}</p>
      <p>Your Email: ${userProfile.data.email}</p>
      <p>Access Token: ${access_token}</p>  <!-- Display the access token -->
      <p>Refresh Token: ${refresh_token}</p>  <!-- Display the refresh token -->
    `); // Send a response to the user with their Spotify profile information.

  } catch (error) {
    console.error('Error exchanging code for token or fetching user profile:', 
      (error.response && error.response.data) || error);
    res.send('Failed to exchange code for token or fetch user profile.'); // Handle errors that occur while exchanging the code or fetching the user profile.
  }
});

app.get('/refresh_token', async (req, res) => {
    const refresh_token = refreshTokens[req.sessionID]; // Retrieve the saved refresh token
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
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // Define a set of characters to generate the random state string from.
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length)); // Loop to generate a random string of the specified length.
  }
  return text; // Return the generated random string.
}

const refreshResponse = await axios({
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token // Use the refresh token saved earlier
    })
  });
  
  const new_access_token = refreshResponse.data.access_token;
  console.log('New access token:', new_access_token);

