import { LyricEffects } from './lyric-effects.mjs';
import { lyricCue, lyricCues } from './lyric-cues.mjs';

const demoLyrics = [
  [0, 'The city lights are waking'],
  [4, 'The night rolls past the glass'],
  [8, 'The road unfolds before me'],
  ...lyricCues.map(([, sample], index) => [12 + index * 4, sample]),
];
const demoLength = demoLyrics.at(-1)[0] + 4;

export function parseLrc(source) {
  const offset = Number(source.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/im)?.[1] || 0) / 1000;
  const lines = new Map();
  for (const row of source.split(/\r?\n/)) {
    const prefix = row.match(/^\s*(?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+/)?.[0];
    if (!prefix) continue;
    const tags = [...prefix.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = row.slice(prefix.length).trim();
    for (const [, minutes, seconds, fraction] of tags) {
      if (+seconds >= 60) continue;
      const at = Math.max(0, +minutes * 60 + +seconds + Number(`0.${fraction || 0}`) + offset);
      lines.set(at, [lines.get(at), text].filter(Boolean).filter((line, i, all) => all.indexOf(line) === i).join('\n'));
    }
  }
  return [...lines.entries()].sort(([a], [b]) => a - b);
}

export function lyricPosition(media, demo, now = Date.now()) {
  const elapsed = !demo && media.playing && Number.isFinite(media.updatedAt)
    ? Math.max(0, (now - media.updatedAt) / 1000) : 0;
  const seconds = (Number.isFinite(media.position) ? media.position : 0) + elapsed;
  return Math.max(0, media.duration > 0 ? Math.min(seconds, media.duration) : seconds);
}

export class LyricsView {
  constructor(root, lookup, seek, { singleLine = false } = {}) {
    this.root = root;
    this.list = root.querySelector('.lyric-lines');
    this.status = root.querySelector('.lyrics-empty');
    this.credit = root.querySelector('.lyrics-credit');
    this.singleLine = singleLine;
    this.lookup = lookup;
    this.seek = seek;
    this.lines = [];
    this.active = -1;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.effects = singleLine ? null : new LyricEffects(root);
  }

  showMessage(message) {
    this.effects?.update(null, 0);
    this.active = -1;
    this.lines = [];
    this.list.replaceChildren();
    this.list.scrollTop = 0;
    this.root.removeAttribute('title');
    this.status.textContent = message;
    this.status.hidden = false;
    if (this.credit) this.credit.hidden = true;
  }

  showLines(lines, plain = '', demo = false) {
    this.effects?.update(null, 0);
    this.lines = lines;
    this.inlineCues = lines.map(([, line]) => lyricCue(line));
    this.active = -1;
    if (this.singleLine) {
      if (!lines.some(([, text]) => text.trim())) return this.showMessage('Timed lyrics unavailable.');
      this.list.textContent = '';
      this.status.hidden = true;
      return;
    }
    this.height = null;
    const elements = lines.length ? lines : plain.split(/\r?\n/).filter(line => line.trim()).map(line => [null, line]);
    if (!elements.length) return this.showMessage('No lyrics found for this track.');
    this.list.replaceChildren(...elements.map(([time, text]) => {
      const line = document.createElement('p');
      if (!text) {
        line.hidden = true;
        return line;
      }
      const label = document.createElement('span');
      label.textContent = text;
      line.append(label);
      if (time !== null && this.seek) {
        const button = document.createElement('button');
        button.type = 'button';
        button.append(label);
        button.onclick = () => {
          if (!this.canSeek) return;
          const position = time + this.demoOffset;
          this.seek(demo && position >= this.duration ? time : position);
        };
        button.disabled = !this.canSeek;
        line.append(button);
      }
      return line;
    }));
    this.list.classList.toggle('synced', Boolean(lines.length));
    this.list.scrollTop = 0;
    this.status.hidden = true;
    this.credit.textContent = demo ? 'Sample lyrics' : lines.length ? 'Lyrics by LRCLIB' : 'Unsynced lyrics · LRCLIB';
    this.credit.hidden = false;
  }

  update(media, visible, demo) {
    this.root.hidden = !visible;
    if (!visible) {
      this.key = null;
      this.effects?.update(null, 0);
      return;
    }
    const key = demo ? 'demo' : media.available && media.title && media.artist
      ? JSON.stringify([media.title, media.artist, media.album || '']) : '';
    const duration = !demo && media.duration >= 1 && media.duration <= 3600 ? Math.round(media.duration) : 0;
    if (key !== this.key || duration !== this.lookupDuration) {
      this.key = key;
      this.lookupDuration = duration;
      const request = this.request = {};
      if (demo) this.showLines(demoLyrics, '', true);
      else if (!media.available) this.showMessage('Play a song to see its lyrics.');
      else if (!key) this.showMessage('The player hasn’t shared the song title and artist.');
      else if (!this.lookup) this.showMessage('Connect to DriveDeck to load lyrics.');
      else {
        this.showMessage('Finding lyrics…');
        Promise.resolve().then(() => this.lookup()).then(result => {
          if (this.key !== key || this.request !== request) return;
          if (result?.key !== key) {
            // The active media session may have changed while the request was in flight.
            this.showMessage('Lyrics unavailable for this track.');
            return;
          }
          if (result.status === 'ready') this.showLines(parseLrc(result.synced || ''), result.plain);
          else if (result.status === 'instrumental') this.showMessage('Instrumental track');
          else if (result.status === 'error') this.showMessage('Lyrics service unavailable. Switch decks to retry.');
          else this.showMessage('LRCLIB has no matching lyrics for this version.');
        }).catch(() => {
          if (this.key === key && this.request === request) this.showMessage('Couldn’t load lyrics. Switch views to try again.');
        });
      }
    }

    const canSeek = Boolean(media.canSeek);
    if (canSeek !== this.canSeek) {
      this.canSeek = canSeek;
      for (const button of this.list.querySelectorAll('button')) button.disabled = !canSeek;
    }
    if (!this.lines.length) return;
    const seconds = lyricPosition(media, demo);
    const position = demo ? seconds % demoLength : seconds;
    this.demoOffset = seconds - position;
    this.duration = media.duration;
    let next = this.lines.findIndex(([time]) => time > position);
    if (next === -1) next = this.lines.length;
    const index = next - 1;
    if (this.singleLine) {
      if (index !== this.active) {
        this.active = index;
        const line = this.lines[index]?.[1].split('\n', 1)[0] || '';
        this.list.textContent = line;
        this.root.title = line;
      }
      return;
    }
    const current = this.list.children[index];
    const start = this.lines[index]?.[0] ?? position;
    this.effects?.update(this.inlineCues[index], position - start, this.reducedMotion.matches);
    const resized = this.height !== this.list.clientHeight || this.width !== this.list.clientWidth;
    if (index !== this.active || resized) {
      this.height = this.list.clientHeight;
      this.width = this.list.clientWidth;
      const previous = this.list.children[this.active];
      previous?.classList.remove('current');
      previous?.removeAttribute('aria-current');
      if (current && !current.hidden) {
        current.classList.add('current');
        current.setAttribute('aria-current', 'true');
      }
      this.active = index;
      const target = current && !current.hidden ? current : this.list.children[next];
      const top = target ? target.offsetTop - (this.list.clientHeight - target.offsetHeight) / 2 : 0;
      const behavior = resized || this.reducedMotion.matches || Math.abs(position - (this.previousPosition ?? position)) > 1.5
        ? 'instant' : 'smooth';
      this.list.scrollTo({ top, behavior });
    }
    if (current && !current.hidden && !this.reducedMotion.matches) {
      const end = this.lines[next]?.[0] ?? Math.min(media.duration || start + 4, start + 4);
      const progress = Math.min(1, (position - start) / Math.max(.05, end - start));
      const value = `${(progress * 100).toFixed(1)}%`;
      if (current.style.getPropertyValue('--lyric-progress') !== value) {
        current.style.setProperty('--lyric-progress', value);
      }
    }
    this.previousPosition = position;
  }
}
