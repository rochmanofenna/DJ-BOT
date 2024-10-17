const axios = require('axios');
const querystring = require('querystring');

// Function to handle Spotify API requests and token refresh
const makeSpotifyRequest = async (url, access_token, refresh_token, client_id, client_secret, req, res) => {
  try {
    // Try making the Spotify API request with the current access token
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    return response.data; // Return the data if successful

  } catch (error) {
    // If the error is 401 Unauthorized, refresh the access token
    if (error.response && error.response.status === 401) {
      console.log('Access token expired. Attempting to refresh...');

      // Refresh the access token using the refresh token
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

        // Extract the new access token
        const new_access_token = refreshResponse.data.access_token;
        console.log('New access token:', new_access_token);

        // Save the new access token in the session or database
        req.session.access_token = new_access_token;

        // Retry the original request with the new access token
        const retryResponse = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${new_access_token}` }
        });
        return retryResponse.data; // Return the data from the retry

      } catch (refreshError) {
        console.error('Error refreshing access token:', refreshError.response ? refreshError.response.data : refreshError);
        res.send('Failed to refresh access token.');
        return null;
      }
    } else {
      // If it's another error, log and return the error message
      console.error('Error making Spotify request:', error.response ? error.response.data : error);
      res.send('Failed to make Spotify request.');
      return null;
    }
  }
};

// Export the function so it can be imported in other files
module.exports = { makeSpotifyRequest };
