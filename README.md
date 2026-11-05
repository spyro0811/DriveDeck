# DriveDeck

A standalone Windows and Linux cockpit for **BeamNG.drive**, designed for the **Corsair XENEON EDGE (2560 × 720)** and other secondary displays.

Open **Display** (monitor icon), select your Edge, and the cockpit opens fullscreen there. **F11** toggles fullscreen; **Escape** returns to a window. Ultra/Vivace fullscreen hides the app chrome; move the pointer to the top edge to reveal the deck selector and controls. The display selection is remembered.

Click the **play icon** to take a demo drive. Demo vehicle data, sample roads, artwork, and the silent sample track are explicitly labeled. The demo selector previews Comfort, Sport, Arsenic, ESC Off, and Offroad. Turn demo off to use actual telemetry and Windows media.

## Exclusive Decks
**Arch BTW** - A linux exclusive analog deck that reads "I use arch btw" in the middle. 

Select decks from the top-left menu or Design. **Match Vivace automatically** optionally selects the replica when the companion reports a Vivace. Apple-inspired styling is original; DriveDeck does not include Apple software, Apple Maps, or a CarPlay connection.

## Deck library and mini player

Open the deck library from the dashboard header to browse images of all 11 decks. Select a card to apply it. Lyrics and DriveDeck Classic were retired in 0.15; old selections migrate to Ultra Glass and the audio visualizer. No lyric service runs or receives song metadata.

The mini player shows live album-colored audio levels with media playback controls.

## Live map and drive-mode sync

Use **Connect → Install companion…**, select the BeamNG user folder, restart the game, then enable **Other UDP protocols** and reload the vehicle. This option is required for the custom feed. See [complete companion instructions](beamng/INSTALL.md).

Version 0.4.3 fixes missing road segments: single-sided graph links are preserved, dense maps export a complete nearby region instead of an arbitrary 6,000-edge subset, missing UDP chunks can be recovered on retries, and intersection fills are drawn over all road borders. The updated companion must be loaded in BeamNG for the export fix.

The live map uses the installed game's road navigation graph and current ground-marker route. It shows actual nearby roads and vehicle position, rendered locally, with zoom and heading-up/north-up controls. The new light map uses green land, white local streets, pale major roads, and a blue circle with a white heading arrow. This is an original Apple Maps-inspired style rendered from BeamNG data. It does not use Apple map tiles or invent street names. Without live data the app shows a connection prompt; it never presents sample roads as game data. The Vivace deck follows the active Comfort, Sport, Arsenic, ESC Off, and Offroad illumination/labels.

### Building outlines (0.8 companion)

The updated companion exports approximate footprints from individually placed building meshes: scaled and rotated mesh bounds, not detailed building floor plans or Apple 3D models. Recognizable building meshes within 3.5 km are scanned in batches of 80 objects per game frame; up to 3,000 nearby outlines are sent in independent recoverable batches. Vegetation, small props and named building parts are excluded. Some custom meshes and forest-instanced buildings may be absent. Roads are rendered over outlines so the existing connected network remains clear.

Existing companions still supply roads and position with the new map style. Update/reload the companion for building outlines. In an existing unpacked installation, return to the driving view when parked, press Ctrl+L, wait for the UI to return, then Ctrl+R. Without live outlines, the app draws only the actual road data; demo buildings remain clearly labeled sample data.

## Connect BeamNG.drive

1. Open BeamNG’s **Options** and find **Protocols**. The category is **Other** or **Advanced**, depending on the game version.
2. Enable **OutGauge UDP**. Set **address `127.0.0.1`**, **port `4444`**, and **update rate 30–60 Hz**.
3. Spawn a vehicle or reload it with **Ctrl + R**.
4. Turn off DriveDeck’s demo mode. The connection badge becomes green when valid packets arrive.

If another app already listens on port 4444, choose another port in DriveDeck’s **Connect** tab and match it in BeamNG. Also change the port in both companion Lua files if using maps/modes. A failed port change preserves the previous listener. DriveDeck listens only on this PC, not your LAN. Companion installation is an explicit app action; original game files are not replaced.

OutGauge supplies speed, engine RPM, gear, fuel fraction, coolant/oil temperature, pedals, turbo pressure, and dashboard light bitmasks. This version displays speed, RPM, gear, fuel, coolant, throttle/brake, turn indicators, high beams, and warning text. Readings become dashes after approximately 1.6 seconds without telemetry. Warnings reflect the game’s bits; the ABS/traction bits can mean intervention or disabled status, depending on the vehicle.

## Design your cockpit

- **Touring:** dial instruments with media and information cards.
- **Sport:** adds a segmented RPM strip and a shift indication at the configured redline.
- **Focus:** full-width instruments.
- **Themes:** AURA (original), ETK, Hirochi, Ibishu, and independent BMW-, Porsche-, and Ferrari-inspired interpretations.


Layouts and card order are configurable. This version does not include an arbitrary drag-and-resize canvas editor. Brand-inspired profiles use original artwork and lettering. DriveDeck is an independent app with no Apple CarPlay or vehicle manufacturer integration. It does not import SignalRGB’s content library; SignalRGB remains a separate app you can switch back to.

## Ultra Sound audio visualizer

Choose **Ultra Sound** from the deck menu, then select **Album art** or **Visualizer** above the center panel. Album art comes from the active Windows media session. A music symbol appears when the player supplies no cover.

Glass, Atlas, and Pure include the six-bar live visualizer in the center of their Now Playing bar, between track details and playback controls. It uses the album-cover palette.

On Ultra Sound, **Song visualizer** toggles six small live bars beside the song name, including while album art is displayed. **Ultra Levels** is the dedicated six-bar page, selected from the deck menu. Both visualizer styles, the speed/RPM gradients, and the ambient glow sample colors from the current album artwork. The six-bar views use slim rounded bars, fast attacks, a quicker falloff, and per-band contrast based on recent audio peaks for wider, more dramatic motion. Silence settles to dots. Dark colors are lifted for readability; monochrome artwork stays neutral. Missing artwork uses the default palette.

The visualizer captures the default Windows multimedia output through WASAPI loopback and computes 32 frequency bands locally. It responds to all sound on that output, including Spotify, BeamNG, and notifications. It does not use the microphone, save audio, or upload audio. Capture runs on Glass, Atlas, Pure, and Levels, or when either Ultra Sound visualizer is enabled in live mode. If you change audio devices, allow up to ten seconds for reconnection or switch to album art and back. Silence produces a quiet baseline; stale audio fades out. Demo animation is explicitly labeled simulated media and does not capture sound.

### Animated artwork (0.5)

In **Connect → Animated artwork**, choose which source to try first and turn either source off independently. The regular Windows album cover is always the last fallback. Turn **Use animated artwork** off for covers only.

- **Apple Music:** automatically matches the current album/artist (or song when album metadata is missing) against Apple's public US catalog, then streams square motion artwork exposed on the album page. This works while listening in Spotify or another Windows media player. Not every release has motion artwork; a different edition may have different availability. No Apple account or subscription is used. Lookup sends the current title, artist, and album to Apple. Matches are cached in memory; errors or unavailable motion fall back to the next enabled source.
- **Spotify Canvas:** automatic access is unavailable through Spotify's public API or Windows media sessions. This is **local-clip support**, not a Spotify account connection. Use **Add Canvas clip…** to assign an MP4/WebM (up to 50 MB) to the current song. Clips are copied into DriveDeck's user-data folder, keyed to that song, and can be cleared from the mapping. No cookies, account tokens, or private Spotify APIs are used.
- **Playback:** animations are muted and loop without controlling the music player. They pause with playback and unload when hidden or disabled. Failed video playback advances to the next enabled source; track changes immediately remove the previous animation. Album palette and visualizers continue using the original cover image.

Examples: Canvas → Apple → cover; Apple → Canvas → cover; Canvas on/Apple off → cover; Apple on/Canvas off → cover. Preferences are saved and exported with your setup. Local clip files are not embedded in exported setup JSON.

Apple page extraction is experimental and may stop working if Apple changes its public page format. **Retry lookup** clears the in-memory cache. **View on Apple Music** opens the source album for attribution.

HLS playback uses [hls.js](https://github.com/video-dev/hls.js) (Apache-2.0); the bundled license is `src/renderer/vendor/hls-LICENSE.txt`.


## Windows media

DriveDeck uses Windows’ **Global System Media Transport Controls** through a hidden PowerShell 5.1 helper. Windows 10 version 1809+ or Windows 11 is required. No Spotify account or developer key is needed.

Start playback in Spotify, a browser exposing a Windows media session, or another compatible player. DriveDeck displays the current session’s title, artist, album, artwork (when provided), progress, and available previous/play/pause/next controls. Media actions are sent only when you press a button. The app never starts playback on its own. Players may omit artwork or disable certain controls.

The helper was checked against a real local Spotify session for metadata and artwork. Automated UI tests use silent demo media and do not change the user’s playback. Company policy that disables PowerShell or Windows media access can prevent this feature; vehicle instruments still work.



- [BeamNG: OutGauge and custom protocols](https://docs.beamng.com/modding/protocols/)
- [Microsoft: Windows global media sessions](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager)
- [Electron: context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)

DriveDeck’s original code and artwork are provided under the MIT license in `LICENSE`.

Map appearance: open Design → Live map → Map appearance to choose Dark or Light. Dark is the default for new and existing profiles. This choice follows Glass, Atlas and Pure and is saved with your settings. The +/− buttons zoom the map in every map deck. No companion reload is needed for this update.

Version 0.9 adds **iadnuyh**, a Hyundai Santa Cruz blue/orange instrument deck with live speed, RPM, gear, fuel, coolant temperature, ambient temperature, odometer and heading compass. Select iadnuyh in the deck menu. Missing vehicle fields show a dash; the center reports active navigation without inventing turn instructions or speed limits. The shared mini player supports visualizer.

Version 0.10 adds **Luce**, a separate three-dial analog deck based on the supplied reference: large central speedometer, orange needles, yellow scale markings, smaller tachometer, fuel arc, gear, trip and coolant readings, plus the shared visualizer mini player. The right dial estimates planar G from speed and heading when both live feeds are available; this is not direct vehicle accelerometer telemetry. Missing or stale signals blank the readings.

Version 0.11 adds **Civetta**, a Scintilla-style digital cluster with a central 0–10 tachometer, orange border, patterned side panels, live speed/gear/fuel and drive-mode colors. It follows actual street/Strada, Sport, track/Corse, Drift and Off modes, plus Velocità/Race. The Display menu follows the mode automatically or keeps Vehicle info, estimated G force, or tire pressure selected. Tire pressure and any unavailable oil/ambient readings show dashes; no tire pressure or range is invented. Shared mini player supports visualizer. Existing companion requires no reload.

Version 0.12 adds an optional **3D perspective** to Atlas. Use its 3D/2D map button or Design → Live map → Atlas view. It projects the same live roads, navigation and heading, and raises actual building footprints with a small schematic height (real heights/elevations are not supplied). The mode follows dark/light appearance and saved zoom/heading settings. Other map decks remain overhead. Atlas keeps RPM as the main right reading and fits N/R/D plus coolant inside the ring in both views.

Version 0.13 uses a black dark-map background. The updated companion optionally samples real terrain materials in a 96×96 grid at 80m spacing, with 96 lookups per frame. Grass/forest becomes muted green, sand/bare soil/canyon rock brown, and asphalt/concrete gray; unknown areas remain black. These are surface classes, not industrial zoning; terrain hidden under meshes can differ from the visible surface. Terrain batches assemble atomically and recover after packet loss. The layer works in overhead and perspective maps. Reload the updated companion once to enable it.

Version 0.15 map update: install/reload the companion for reported building heights and visible-surface sampling near the car. Whole-block bounds and footprints crossing road centerlines are omitted conservatively. Unknown terrain is neutral charcoal; areas outside the sampled region remain black. Surface naming and source meshes still limit accuracy.

Version 0.15.1 uses actual building-footprint coverage to give built-up blocks a neutral base instead of showing dirt/grass from underneath city meshes. This is a schematic map treatment, not exact land-use or park boundaries. Open terrain retains material colors. No companion reload is needed.

Version 0.16.0 uses the supplied Bastion, Ardente, Vivace, Scintilla/Civetta, ETK, Pigeon, H-Series/Van and Hopper PNGs in both driving views. PNGs remain unchanged and transparent; SVG view boxes trim padding. Unsupported models retain a generic illustration. Ardente shares the Vivace platform folder: the updated companion identifies the selected body/configuration so its name, driving graphic, Park preview and automatic Vivace selection stay distinct. Reload the vehicle after installing the companion fix.


## Phone dashboard preview

In Settings → Connect, choose **Start phone dashboard**. Scan the QR code on a phone or tablet on the same Wi-Fi. Keep DriveDeck running on the PC; if Windows asks, allow the app on your private network. **View instructions** opens https://drivedecks.app/mobile.

All twelve decks, live instruments, maps, vehicle previews and PC audio visualizers are available. Phone deck selection is independent of the PC. Music playback controls and animated covers are not included on the phone yet. Position updates use the faster dashboard feed, while unchanged map geometry stays cached.

For manual pairing, use **Connect** on the phone and enter the PC address (including port) and eight-character code displayed below the QR. The phone exchanges the code for a full session key and remembers it. Incorrect attempts are limited. Sharing is off at startup; stopping it or closing DriveDeck revokes the connection. A new sharing session may use a different port and always creates a new code. If a Home Screen shortcut points to an old address, recreate it from the new QR link. The expanded dashboard hides its own toolbar; browser controls depend on the phone/browser.

## Window resolution

Settings → Display includes resolution presets and custom dimensions. Apply resolution exits fullscreen, changes the window size, and saves the size for next launch. These controls are included in the regular installer source as well as portable builds.


## Linux and Steam Deck

Linux packages are prepared for x86-64 desktops and Steam Deck. See [LINUX-QUICKSTART.md](LINUX-QUICKSTART.md) for installation and companion setup, or [LINUX.md](LINUX.md) for development details. The AppImage supports in-app updates; Debian and portable packages update manually. Linux includes the exclusive Arch BTW deck. Linux-only releases do not replace the Windows update destination. Distribution coverage remains limited.
