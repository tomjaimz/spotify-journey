/* eslint-disable no-console */
const { getPlaylistTracksWithAudioFeatures } = require('./interface');

const TEMPO_THRESHOLD = 0.33;

const tempoCheck = (a, b) =>
  Math.abs(1 - a / b) / (Math.pow(2, 1 / 12) - 1) < TEMPO_THRESHOLD;

const keyToNote = data => {
  const NOTES = 'C,Db,D,Eb,E,F,F#,G,Ab,A,Bb,B';
  const CAMELOT = '5,12,7,2,9,4,11,6,1,8,3,10';
  const note = NOTES.split(',')[data.key] + (data.mode ? 'M' : 'm');
  const camelotIndex = (data.key + data.mode * 9) % 12;
  const camelot = CAMELOT.split(',')[camelotIndex] + (data.mode ? 'B' : 'A');
  return `${note} [${camelot}]`;
};

const keyCheck = (a, b) =>
  (a.mode === b.mode &&
    (a.key === b.key ||
      (a.key + 17) % 12 === b.key ||
      (a.key + 7) % 12 === b.key)) ||
  (a.mode !== b.mode && (12 + a.key + 3 * (b.mode - a.mode)) % 12 === b.key);

const addTrackMatches = (track, trackData) => {
  const { id, tempo, name, artists } = track;
  const key = { key: track.key, mode: track.mode };
  const tempoMatches = trackData
    .filter(check => check.id !== id && tempoCheck(check.tempo, tempo))
    .map(tempoTrack => ({
      id: tempoTrack.id,
      score: tempoCheck(tempoTrack.tempo, tempo),
    }));
  const keyMatches = trackData
    .filter(
      check =>
        check.id !== id && keyCheck({ key: check.key, mode: check.mode }, key),
    )
    .map(keyTrack => ({ id: keyTrack.id }));
  const matches = tempoMatches
    .filter(tempoMatch =>
      keyMatches.map(keyMatch => keyMatch.id).includes(tempoMatch.id),
    )
    .map(tempoMatch => tempoMatch.id);
  return {
    id,
    tempo,
    key,
    name,
    note: keyToNote(key),
    artists: artists.map(e => e.name).join(', '),
    matches,
  };
};

const poolToJourney = (pool, trackData) => {
  if (!pool.length) return null;

  const tracks = pool.map(trackId =>
    trackData.find(({ id }) => id === trackId),
  );

  const journey = [];
  let track = tracks.sort((a, b) => a.matches.length - b.matches.length)[0];
  // track = tracks[Math.floor(Math.random() * tracks.length)];
  do {
    const trackId = track.id;
    const matches = track.matches;
    journey.push(track);

    // remove this track from the available tracks, and matches
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].id === trackId) {
        tracks.splice(i--, 1);
        continue;
      }
      const matchIndex = tracks[i].matches.indexOf(trackId);
      if (matchIndex > -1) {
        tracks[i].matches.splice(matchIndex, 1);
      }
    }

    track = tracks
      .filter(({ id }) => matches.includes(id))
      .sort((a, b) => a.matches.length - b.matches.length)[0];
  } while (track);

  return journey;
};

const getJourney = async input => {
  const playlistId = input.replace('spotify:playlist:', '');
  const tracks = await getPlaylistTracksWithAudioFeatures(playlistId);
  const trackData = tracks.map(track => addTrackMatches(track, tracks));
  const trackPools = []; // array of arrays of pools

  for (const track of trackData) {
    const { id, matches } = track;
    const matchPools = [];
    // we want to identify what track pools (if any), the matches of
    // this track belong to, and add this track to that pool if there are
    for (let i = 0; i < trackPools.length; i++) {
      for (const match of matches) {
        if (trackPools[i].includes(match) && !matchPools.includes(i)) {
          matchPools.push(i);
        }
      }
    }
    if (matchPools.length === 0) {
      // none of the matches are in any track pools
      const matchPoolIndex = trackPools.length;
      trackPools[matchPoolIndex] = [id];
    } else if (matchPools.length === 1) {
      const matchPoolIndex = matchPools[0];
      // the matches all belong to the same (or no) pool
      trackPools[matchPoolIndex] = [id, ...trackPools[matchPoolIndex]];
    } else {
      // matches belong to multiple matchPools, so merge those matchPools
      const matchPoolIndex = matchPools[0];
      trackPools[matchPoolIndex].push(id);
      for (let i = 1; i < matchPools.length; i++) {
        trackPools[matchPoolIndex].push(...trackPools[matchPools[i]]);
        trackPools[matchPools[i]] = [];
      }
    }
  }
  return trackPools
    .map(pool => poolToJourney(pool, trackData))
    .filter(a => a && a.length > 4); // get rid of empty journies
};

exports.getJourney = getJourney;
