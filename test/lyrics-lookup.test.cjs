const test = require('node:test');
const assert = require('node:assert/strict');
const { Lyrics } = require('../src/lib/lyrics.cjs');

const media = { available: true, title: 'Open Roads (Official Music Video)', artist: 'Demo Artist', album: 'Night Drive', duration: 180 };
const track = { trackName: 'Open Roads', artistName: 'Demo Artist', albumName: 'Night Drive', duration: 183,
  syncedLyrics: '[00:02.00] A sample line', plainLyrics: 'A sample line' };

test('Recover a missed video title and select the matching recording instead of a cover or long edit', async () => {
  const calls = [];
  const lookup = new Lyrics('test', async raw => {
    const url = new URL(raw);
    calls.push(url);
    if (url.pathname === '/api/get') return new Response(null, { status: 404 });
    return Response.json([
      { ...track, artistName: 'Cover Artist' },
      { ...track, duration: 245, syncedLyrics: '[00:42.00] Extended intro' },
      track,
    ]);
  });
  const result = await lookup.lookup(media);
  assert.equal(calls[1].searchParams.get('track_name'), 'Open Roads');
  assert.equal(result.synced, track.syncedLyrics);
  assert.equal((await lookup.lookup({ ...media, duration: 160 })).synced, '');
  assert.equal(calls.length, 4);
});

test('A rate limit is shown as a service issue and does not trigger another network request', async () => {
  let requests = 0;
  const lookup = new Lyrics('test', async () => {
    requests++;
    return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
  });
  assert.equal((await lookup.lookup(media)).status, 'error');
  assert.equal((await lookup.lookup({ ...media, title: 'Another title' })).status, 'error');
  assert.equal(requests, 1);
});
