const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const access_token = process.env.SPOTIFY_ACCESS_TOKEN; // Use environment variable for the access token

// Read the metadata file and extract track names and BPM
const readFileAndExtractTracks = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }

            const trackList = data.split('\n').map(line => {
                const [trackDetails, bpm] = line.split(','); // Split by comma to separate track and BPM
                return trackDetails.trim();  // Only return the track details part
            }).filter(line => line.length > 0);

            resolve(trackList);
        });
    });
};

const getUserId = async () => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        return response.data.id;  // Return the user's Spotify ID
    } catch (error) {
        console.error('Error fetching user ID:', error.response ? error.response.data : error);
        return null;
    }
};

const createPlaylist = async (user_id, playlist_name) => {
    const createPlaylistURL = `https://api.spotify.com/v1/users/${user_id}/playlists`;

    try {
        const response = await axios.post(createPlaylistURL, {
            name: playlist_name,
            description: 'A playlist created programmatically',
            public: false
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const playlist_id = response.data.id;
        return playlist_id;
    } catch (error) {
        console.error('Error creating playlist:', error.response ? error.response.data : error);
        return null;
    }
};

// Search for track on Spotify and return its URI
const searchTrack = async (trackDetails) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            },
            params: {
                q: trackDetails,
                type: 'track',
                limit: 1
            }
        });

        const track = response.data.tracks.items[0];
        return track ? track.uri : null;  // Return Spotify URI

    } catch (error) {
        console.error('Error searching track:', error);
        return null;
    }
};

// Get all track URIs for the list of track details
const getAllTrackUris = async (trackList) => {
    const uris = [];

    for (const trackDetails of trackList) {
        const uri = await searchTrack(trackDetails);
        if (uri) {
            uris.push(uri);
        }
    }

    return uris;
};

// Add tracks to a playlist by their URIs
const addTracksToPlaylist = async (playlist_id, track_uris) => {
    const addTracksURL = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`;

    try {
        await axios.post(addTracksURL, {
            uris: track_uris
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Tracks added successfully');

    } catch (error) {
        console.error('Error adding tracks:', error.response ? error.response.data : error);
    }
};

// Main function to handle playlist creation and track addition
const createPlaylistFromTracks = async (file_path, playlist_name) => {
    const trackList = await readFileAndExtractTracks(file_path);
    const user_id = await getUserId();

    if (!user_id) {
        console.error('Unable to retrieve user ID');
        return;
    }

    const playlist_id = await createPlaylist(user_id, playlist_name);
    if (playlist_id) {
        const track_uris = await getAllTrackUris(trackList);
        if (track_uris.length > 0) {
            await addTracksToPlaylist(playlist_id, track_uris);
        } else {
            console.log('No valid tracks found for this playlist');
        }
    }
};

// Example usage for Chill Hip-Hop/Trap EDM and Festival Trap EDM Playlists
// const file_path_progressive = './datasets/metadata/ProgressiveHouseEDM.txt';

// Create the chill playlist
// createPlaylistFromTracks(file_path_progressive, 'ProgressiveHouse')


const file_path_chill = './datasets/metadata/ChillHouse.txt';
const file_path_deep = './datasets/metadata/DeepHouse.txt'
const file_path_dnb = './datasets/metadata/DnB.txt'
const file_path_dubstep = './datasets/metadata/Dubstep.txt'
const file_path_future = './datasets/metadata/FutureHouse.txt'
const file_path_garage = './datasets/metadata/Garage.txt'
const file_path_melodic = './datasets/metadata/MelodicHouse.txt'
const file_path_progressive = './datasets/metadata/ProgressiveHouse.txt'
const file_path_tech = './datasets/metadata/TechHouse.txt'
const file_path_techno = './datasets/metadata/Techno.txt'
const file_path_trance = './datasets/metadata/Trance.txt'
const file_path_tropical = './datasets/metadata/TropicalHouse.txt'

createPlaylistFromTracks(file_path_deep, 'DeepHouse')



