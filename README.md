# Mix To Playlist

This Node application will take a playlist (as a command line argument), and then output one or more "Journeys".

The Journeys are then presented both as a tracklist, and a list of Spotify URIs (that can be cut and pasted into the Spotify app for a playlist)

You will need to:

1. Create Spotify application to access the Spotify API.
   - Create an application at https://developer.spotify.com/dashboard/applications
   - Copy the `CLIENT_ID` and `CLIENT_SECRET` to the corresponding fields in the `config.js` file.
1. Install `node` if you don't already have it.
1. Run `npm install`
1. Run `node index.js [playlist uri]` (where `[playlist uri]` is a URI of a Spotify playlist, in "spotify:playlist:uuid" form)
   - On the first run you will be asked to click on a link to store a token. This will be stored as `config/token.json`, and the user that approved the token will have playlists created in their account. If you need a new token (for a new user), just delete the `config/token.json` file.

## What is a Journey?

A journey is a playlist where each track can be smoothly mixed into the next. The definition of "smoothly mixed" is as follow:

1. The tempo should be within 2 BPM.
1. The key should be in harmony, according to the camelot wheel.
