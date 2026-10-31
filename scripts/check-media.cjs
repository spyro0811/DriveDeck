const { Media } = require('../src/lib/media.cjs');
const helper = new Media();
process.env.DRIVEDECK_MEDIA_TRACE = '1';
const timer = setTimeout(() => { console.error('FAIL: media helper did not publish a state within 12 seconds.'); helper.stop(); process.exitCode = 1; }, 12000);
helper.once('state', state => {
  clearTimeout(timer);
  console.log(JSON.stringify({ available: state.available, hasTitle: !!state.title, hasArtwork: !!state.artwork, canToggle: state.canToggle, canNext: state.canNext, canPrevious: state.canPrevious, hasDuration: state.duration > 0, source: state.source || null, error: state.error || null }));
  helper.stop();
  if (state.error) process.exitCode = 1;
});
helper.start();
helper.child?.stdout.on('data', chunk => {
  for (const line of chunk.toString().split('\n')) {
    try { const data = JSON.parse(line); if (data.type === 'trace') console.log(data.data); } catch {}
  }
});
helper.child?.stderr.on('data', chunk => console.error(chunk.toString()));
