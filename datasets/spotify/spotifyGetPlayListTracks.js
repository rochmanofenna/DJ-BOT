console.log("Script started...");

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const querystring = require('querystring');

// Load environment variables
const access_token = process.env.SPOTIFY_ACCESS_TOKEN;
console.log("Access Token: ", access_token);

process.on('unhandledRejection', error => {
  console.error('Unhandled Rejection:', error);
});

// Function to get user playlists
async function getUserPlaylists() {
  try {
    console.log("Fetching playlists...");
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const playlists = response.data.items;
    const playlistMap = {};

    playlists.forEach(playlist => {
      playlistMap[playlist.name] = playlist.id;  // Map playlist name to ID
    });

    console.log("Playlists fetched successfully.");
    return playlistMap;  // Return a map of playlist names to IDs
  } catch (error) {
    console.error('Error fetching playlists:', error.response ? error.response.data : error);
    return null;
  }
}

// Function to get tracks from a playlist
async function getPlaylistTracks(playlist_id) {
  try {
    let tracks = [];
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`;

    // Continue fetching tracks until the `next` property is null
    while (nextUrl) {
      const response = await axios.get(nextUrl, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const { items, next } = response.data;
      tracks.push(...items);  // Add the current batch of tracks
      nextUrl = next;  // If there is a next page, update nextUrl
    }

    console.log(`Tracks fetched for playlist ID: ${playlist_id}`);
    return tracks;
  } catch (error) {
    console.error('Error fetching playlist tracks:', error.response ? error.response.data : error);
    return [];
  }
}

async function getAudioFeatures(track_id) {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/audio-features/${track_id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`  // Use the same access token
      }
    });
    return response.data;  // Return the audio features data
  } catch (error) {
    console.error('Error fetching audio features:', error.response ? error.response.data : error);
    return null;
  }
}

// Function to write track metadata to a file
async function writeTracksToFile(playlist_name, tracks) {
  const metadata = [];

  for (let item of tracks) {
    const track = item.track;

    // Fetch audio features for the current track
    const audioFeatures = await getAudioFeatures(track.id);

    // Only push data if audio features were successfully fetched
    if (audioFeatures) {
      metadata.push({
        track_name: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        bpm: audioFeatures.tempo,  // 'tempo' is the field name for BPM in the audio features
        key: audioFeatures.key,
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        energy: audioFeatures.energy,
        danceability: audioFeatures.danceability,
        valence: audioFeatures.valence,
        instrumentalness: audioFeatures.instrumentalness,
      });
    }
  }

  // Write metadata to JSON file in the spotify folder
  const filePath = `./datasets/spotify/${playlist_name}_metadata.json`;
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  console.log(`Track metadata exported to ${filePath}`);
}

// Function to fetch playlist data and export metadata
async function fetchAndExportMetadata(playlist_id, playlist_name) {
  console.log(`Fetching tracks for playlist: ${playlist_name}`);
  const tracks = await getPlaylistTracks(playlist_id);
  if (tracks.length > 0) {
    await writeTracksToFile(playlist_name, tracks);
  } else {
    console.error(`No tracks found for playlist: ${playlist_name}`);
  }
}

async function main() {
  console.log("Main function started...");

  // Fetch user playlists
  const playlists = await getUserPlaylists();
  
  if (!playlists) {
    console.error('Failed to retrieve playlists.');
    return;
  }

  console.log('Available playlists:');
  console.log(playlists);  // Log available playlists for debugging



  const ProgressiveHouseID = playlists['ProgressiveHouse']; 

  if (ProgressiveHouseID) {
    await fetchAndExportMetadata(ProgressiveHouseID, 'ProgressiveHouse');
  } else {
    console.error('Playlist not found');
  }

}

// Run the main function
main();
