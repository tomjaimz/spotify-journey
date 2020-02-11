const response = require('./response');

const getPlaylistTracksWithAudioFeatures = async playlistId => {
  const playlistTracks = await response({
    type: 'paged',
    url: `playlists/${playlistId}/tracks`,
    query: { offset: 0, limit: 100 },
  });

  const tracks = playlistTracks.items
    .filter(track => track)
    .map(track => track.track);

  const audioFeatures = await response({
    url: 'audio-features',
    label: 'audio_features',
    ids: tracks.map(({ id }) => id),
    max: 100,
  });

  return tracks.map(track => ({
    ...track,
    ...audioFeatures.find(({ id }) => id === track.id),
  }));
};

module.exports = {
  getPlaylistTracksWithAudioFeatures,
};
