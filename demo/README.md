# DriveDeck interactive HTML embed demo

This browser-only demo uses the real twelve dashboard renderers with simulated vehicle/map data. No BeamNG installation, companion, Electron, account, or API key is needed.

## Preview

From the DriveDeck project, run:

```
npm run demo:serve
```

Open http://127.0.0.1:4174. It starts with the walkthrough and no audio. Click **Play demo** to start the supplied Flashing Lights recording, choose a random car, and drive around the sample city route. Model S and Model Three always use Cherrier Ardente. All speed, RPM, route, and drive-mode values in this demo are simulated; the frequency visualizers analyse the actual music through Web Audio.

- **Change deck:** screenshot library with all twelve decks.
- **P / R / N / D:** shown for Model S and Model Three. Click the toolbar letters or the letters on the dashboard. Model Three has its Park fly-in. D resumes the simulated drive; Park leaves the music playing.
- **Drive mode:** Comfort, Sport, Arsenic, Drift (purple), and ESC off.
- **Apple Music:** explains how the desktop app matches albums and finds animated artwork. Also accessible from the Apple Music label in Ultra Sound.
- **Ultra Sound:** dedicated bottom playback controls and a seek bar, without a duplicate mini player. Other decks keep their mini players.
- **?** replays the guided walkthrough.
- **Pause music:** use the toolbar music button or the mini player’s pause button; driving continues. **Pause demo** pauses driving independently.
- **Volume / Mute:** control only this demo’s audio.

## Host and embed

Run `npm run demo:build`. Upload **all of `dist/embed/`**, including its subfolders, to a static HTTPS host. The ready-to-upload ZIP is `dist/DriveDeck-HTML-Demo.zip`. Do not upload only index.html, and do not open it with file://: the demo uses JavaScript modules and fetches its local assets.

Replace the URL below with your hosted demo URL:

```html
<iframe
  src="https://YOUR-HOST/drivedeck-demo/"
  title="DriveDeck interactive demo"
  width="100%"
  height="720"
  style="border:0;border-radius:20px"
  allow="autoplay; fullscreen"
  loading="lazy"
></iframe>
```

Recommended desktop size: at least 1000×500. Narrow embeds scale the dashboard and keep the controls outside it. Browser audio policies still require a visitor’s Play click. Avoid an opaque-origin iframe sandbox; if your host requires sandboxing, allow scripts and same-origin access for local assets/Web Audio.

The Graduation cover animation is streamed directly from Apple’s public artwork CDN. It needs an internet connection, and Apple can change availability. A bundled static cover is always available as fallback. `demo/assets/apple-motion.json` records the matching album and stream discovered with the app’s existing lookup; it contains no account tokens. The demo does not scrape Apple from the visitor’s browser or need an Apple Music subscription.

The provided MP3, album cover, and matching BeamNG Ardente preview are included in the demo assets. The rear Ardente graphic and all other vehicle graphics remain the same supplied assets used by DriveDeck. Demo assets and logic are separate from the desktop app; this does not change desktop telemetry, updater behavior, or saved settings.

## Verify

- `npm test`: includes driving path, PRND, fixed Ardente identity, and FFT band mapping.
- `node scripts/build-demo.cjs`
- `node scripts/demo-server.cjs`
- In another terminal: `node_modules/.bin/electron scripts/check-demo.cjs` (on Windows, `electron.cmd`).

The browser QA harness uses its own window/profile and mutes audio output. It checks real playback, nonzero frequency analysis, all deck selections, PRND/animation, drive modes, Apple explanation, and actual animated-cover playback. Screenshots and its report go to `artifacts/embed/`.
