/* eslint-disable no-console */
const { getJourney } = require('./getJourney');

const main = async () => {
  const input = process.argv[2];
  if (!input) {
    console.log('usage: node index.js [playlist uri]');
    return;
  }

  try {
    const journeys = await getJourney(input);
    if (journeys) {
      for (const journey of journeys) {
        console.log(`\nJourney tracklist:`);
        console.log(
          journey
            .map(
              ({ artists, tempo, note, name }, i) =>
                `${i + 1}: ${artists} - ${name} | ${tempo.toFixed(
                  0,
                )} | ${note}`,
            )
            .join('\n'),
        );
        console.log(`\nCopy and paste into Spotify application:`);
        console.log(journey.map(({ id }) => `spotify:track:${id}`).join('\n'));
      }
    }
  } catch (e) {
    console.error(e);
  }
};

main();
