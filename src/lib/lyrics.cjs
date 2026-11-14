const EMPTY = { status: 'missing' };
const UNAVAILABLE = { status: 'error' };

function cleanTitle(title) {
  const annotation = /\s*[([](?:feat\.?|ft\.?|featuring|official\s+(?:music\s+)?video|official audio|lyrics?|visualizer|remaster(?:ed)?(?:\s+\d{4})?)\b[^)\]]*[)\]]\s*$/i;
  const suffix = /\s+[-–—]\s+(?:official (?:music video|video|audio)|lyric video|lyrics|visualizer|\d{4} remaster(?:ed)?|remaster(?:ed)?(?: \d{4})?)\s*$/i;
  let cleaned = title.trim();
  while (annotation.test(cleaned) || suffix.test(cleaned)) cleaned = cleaned.replace(annotation, '').replace(suffix, '').trim();
  return cleaned;
}

function normalize(value = '') {
  return String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function leadArtist(name = '') {
  return String(name).split(/\s+\(?\b(?:feat\.?|ft\.?|featuring)\s+/i)[0].trim();
}

function lyricResult(track, timed = true) {
  const synced = timed && typeof track?.syncedLyrics === 'string' ? track.syncedLyrics.trim().slice(0, 32000) : '';
  const plain = typeof track?.plainLyrics === 'string' ? track.plainLyrics.trim().slice(0, 32000) : '';
  return synced || plain ? { status: 'ready', synced, plain } : EMPTY;
}

function bestMatch(rows, media, title, artist, duration) {
  const candidates = [];
  for (const row of rows.slice(0, 20)) {
    if (!row || row.instrumental || normalize(cleanTitle(String(row.trackName || row.name || ''))) !== normalize(title)) continue;
    const sameArtist = normalize(row.artistName) === normalize(media.artist);
    if (!sameArtist && normalize(leadArtist(row.artistName || '')) !== normalize(artist)) continue;
    const sameAlbum = Boolean(media.album && normalize(row.albumName) === normalize(media.album));
    const difference = duration > 0 && row.duration > 0 ? Math.abs(row.duration - duration) : Infinity;
    // A mismatched recording may have the same words but a different timeline.
    const result = lyricResult(row, difference <= 4 || (!duration && sameArtist && sameAlbum));
    if (result.status !== 'ready') continue;
    const score = (result.synced ? 100 : 0) + (sameArtist ? 12 : 0) + (sameAlbum ? 8 : 0) - Math.min(12, difference);
    candidates.push({ score, result });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.result || EMPTY;
}

class Lyrics {
  constructor(version, fetchLyrics = fetch) {
    this.fetchLyrics = fetchLyrics;
    this.userAgent = `DriveDeck/${version} (https://drivedecks.app)`;
    this.cache = new Map();
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.retryAt = 0;
  }

  lookup(media) {
    if (!media.available || !media.title?.trim() || !media.artist?.trim()) return { status: 'metadata' };
    const key = JSON.stringify([media.title, media.artist, media.album || '']);
    const duration = media.duration >= 1 && media.duration <= 3600 ? Math.round(media.duration) : 0;
    const cacheKey = JSON.stringify([key, duration]);
    const cached = this.cache.get(cacheKey);
    if (cached?.expires > Date.now()) return cached.result;
    if (this.pending.has(cacheKey)) return this.pending.get(cacheKey);
    if (this.pending.size >= 8) return { key, status: 'error' };

    const request = this.queue.then(async () => {
      const result = { key, ...await this.fetchTrack(media, duration) };
      const ttl = result.status === 'error' ? 10000 : result.status === 'missing' ? 300000 : 3600000;
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, { result, expires: Date.now() + ttl });
      if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value);
      return result;
    }).finally(() => this.pending.delete(cacheKey));
    this.queue = request.catch(() => {});
    this.pending.set(cacheKey, request);
    return request;
  }

  async fetchTrack(media, duration) {
    if (Date.now() < this.retryAt) return UNAVAILABLE;
    const parameters = new URLSearchParams({
      track_name: media.title.slice(0, 300),
      artist_name: media.artist.slice(0, 300),
    });
    if (media.album) parameters.set('album_name', media.album.slice(0, 300));
    if (duration) parameters.set('duration', duration);
    const timeout = AbortSignal.timeout(6500);
    try {
      const exact = await this.request('get', parameters, timeout);
      const direct = lyricResult(exact);
      if (exact?.instrumental) return { status: 'instrumental' };
      if (direct.synced) return direct;
      const title = cleanTitle(media.title) || media.title;
      const artist = leadArtist(media.artist) || media.artist;
      const search = new URLSearchParams({ track_name: title.slice(0, 300), artist_name: artist.slice(0, 300) });
      try {
        const rows = await this.request('search', search, timeout);
        const matched = bestMatch(Array.isArray(rows) ? rows : [], media, title, artist, duration);
        return matched.synced || direct.status !== 'ready' ? matched : direct;
      } catch {
        return direct.status === 'ready' ? direct : UNAVAILABLE;
      }
    } catch {
      return UNAVAILABLE;
    }
  }

  async request(endpoint, parameters, signal) {
    const response = await this.fetchLyrics(`https://lrclib.net/api/${endpoint}?${parameters}`, {
      headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
      signal,
      redirect: 'error',
    });
    if (response.status === 404) return null;
    if (response.status === 429 || response.status === 503) {
      const header = response.headers.get('Retry-After');
      const seconds = header && /^\d+$/.test(header) ? Number(header) : (Date.parse(header) - Date.now()) / 1000;
      this.retryAt = Date.now() + Math.max(1, Number.isFinite(seconds) ? seconds : 60) * 1000 * (1 + Math.random() * .25);
    }
    if (!response.ok) throw new Error(`Lyric lookup failed: ${response.status}`);
    return response.json();
  }
}

module.exports = { Lyrics };
