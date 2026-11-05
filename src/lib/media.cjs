const { spawn } = require('node:child_process');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const EMPTY = { available: false, title: '', artist: '', album: '', playing: false, position: 0, duration: 0, artwork: null, canToggle: false, canNext: false, canPrevious: false, canSeek: false };

class Media extends EventEmitter {
  constructor(options = {}) { super(); if((options.platform||process.platform)==='linux')return new (require('./linux-media.cjs').LinuxMedia)(options); this.scriptPath = options.scriptPath||path.join(__dirname, '../../native/media.ps1'); this.state = { ...EMPTY }; this.child = null; this.pending = new Map(); this.id = 0; }
  start() {
    if (process.platform !== 'win32') { this.state.error = 'Music integration is not available on this platform.'; return; }
    if (this.child) return;
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    let buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 3 * 1024 * 1024) { buffer = ''; return; }
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        try {
          const message = JSON.parse(line);
          if (message.type === 'state') {
            this.state = { ...EMPTY, ...message.data, updatedAt: Date.now() };
            this.emit('state', this.state);
          }
          if (message.type === 'result' && this.pending.has(message.id)) {
            const pending = this.pending.get(message.id); clearTimeout(pending.timer);
            this.pending.delete(message.id); pending.resolve({ ok: message.ok === true, error: message.error });
          }
        } catch {}
      }
    });
    child.stderr.on('data', chunk => { this.state = { ...EMPTY, error: chunk.toString().trim().slice(0, 300) }; });
    const ended = () => {
      if (this.child === child) this.child = null;
      this.state = { ...EMPTY, error: 'Windows media helper stopped. Restart DriveDeck to reconnect.' };
      this.emit('state', this.state);
      for (const request of this.pending.values()) { clearTimeout(request.timer); request.resolve({ ok: false, error: this.state.error }); }
      this.pending.clear();
    };
    child.on('error', ended); child.on('exit', ended);
    child.stdin.on('error', () => {});
  }
  command(action,position) {
    if (!['toggle', 'next', 'previous','seek'].includes(action)) return Promise.resolve({ ok: false, error: 'Unknown media action.' });
    if (!this.child || !this.state.available) return Promise.resolve({ ok: false, error: 'Start playback in Spotify, a browser, or another Windows media app first.' });
    if(action==='seek'&&(!Number.isFinite(position)||position<0||!Number.isFinite(this.state.duration)||position>this.state.duration))return Promise.resolve({ok:false,error:'Invalid playback position.'});
    const capability = { toggle: 'canToggle', next: 'canNext', previous: 'canPrevious',seek:'canSeek' }[action];
    if (!this.state[capability]) return Promise.resolve({ ok: false, error: 'This player does not support that control.' });
    const id = ++this.id;
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.pending.delete(id); resolve({ ok: false, error: 'The media player did not respond.' }); }, 5000);
      this.pending.set(id, { resolve, timer });
      this.child.stdin.write(`${JSON.stringify({ id, action,...(action==='seek'?{position}:{}) })}\n`);
    });
  }
  stop() { if (this.child) { this.child.kill(); this.child = null; } }
}

module.exports = { Media, EMPTY };
