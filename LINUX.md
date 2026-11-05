# Experimental Linux development

This is an experimental Linux port. A local Steam Deck portable package has been built; it has not been published as a general Linux release. Initial Steam Deck feedback confirms telemetry and audio work, while companion integration is still being checked. The shared decks, local UDP telemetry, map and phone server remain the same code as Windows. Native desktop, live BeamNG integration, display behavior and packaging still need validation on Linux hardware.

## Running the source on a Linux desktop

Use a normal desktop login session with Node.js 22 and npm. From the source folder, run `npm ci`, `npm test`, then `npm start`. Electron needs the desktop libraries for your distribution and a working graphical session; do not disable its sandbox as a workaround. No Python helper is required for the new Linux music or audio backends.

Optional music features require:

- `playerctl`: reads MPRIS players in your current D-Bus session and sends play/pause, previous, next and seek requests. It prefers a playing player over a paused player. Individual players can reject unsupported controls. Metadata is polled once per second. Install playerctl with your distribution’s package manager if absent.
- `parec`: captures the default output **monitor**, not the microphone, as signed 16-bit mono PCM. DriveDeck computes its 32 frequency bands locally. This requires PulseAudio or PipeWire with its PulseAudio-compatible service. `parec` is commonly in `pulseaudio-utils` (Debian/Ubuntu) or `pulseaudio-utils`/`pulseaudio` equivalents elsewhere. Missing support leaves instruments working and displays an audio error. Recording is active while a desktop visualizer or phone sharing needs the spectrum; samples are not written to disk.

Local and HTTPS JPEG/PNG/WebP MPRIS artwork is supported with a size limit and a bounded download timeout. This artwork supplies the shared album palette for Ultra Sound, Ultra Levels and the media-player visualizer. Existing Apple animated-artwork lookup remains shared code, but Linux playback codecs and animated artwork have not been validated. Track information is passed to Apple only according to the existing artwork settings.

## BeamNG and Steam folders

The native default user folder is `${XDG_DATA_HOME:-$HOME/.local/share}/BeamNG/BeamNG.drive/current`. Use Connect → Install companion and choose the actual user folder for your game. The installer still backs up an old companion before replacing it; native Linux and Proton use different user folders. The picker detects native and Proton user folders, including Steam libraries listed on SD cards. Choose the Proton entry when the game runs with Proton. The newest game log is suggested first, and the full installation path is shown afterward. Fully restart BeamNG, enable the companion in Mod Manager, and enable Other UDP protocols.

Preview discovery checks common native and Flatpak Steam roots and their `libraryfolders.vdf` entries. Proton discovery checks BeamNG’s Steam prefix (app ID 284160) and ranks existing user folders by their game log modification time. Custom game user folders can still be selected manually. Set the following environment variables before launching DriveDeck when needed:

```sh
export DRIVEDECK_BEAMNG_USER="/absolute/path/to/BeamNG/user/current"
export DRIVEDECK_BEAMNG_GAME="/absolute/path/to/BeamNG.drive"
npm start
```

The game override is the installation root containing `content/vehicles`. The user override is the folder containing `mods` and `settings`. These affect preview discovery and the companion folder picker default. Custom BeamNG INI overrides are not automatically read yet.

Both apps must use the same UDP port (normally 4444). The existing companion is bundled as source/ZIP and uses the same protocol; actual native and Proton behavior must be tested before claiming Linux compatibility.

## Packages and updates

`npm run linux:package` is prepared to build x64 AppImage and Debian packages on a Linux host. It is explicitly non-publishing and refuses to run on another OS. The Build Linux release workflow runs tests, builds packages, launches the actual AppImage under Xvfb with synthetic UDP input, validates checksums and uploads a draft. It is triggered manually or by linux-vVERSION tags. The shared release workflow reuses this Linux build when creating future Windows and Linux releases. Linux-only tags and manual Linux builds do not start Windows builds. Build outputs are experimental until tested on real distributions.

AppImage builds support in-app update checks, explicit downloads and restart-to-install. Linux looks for published releases containing latest-linux.yml and an AppImage for its architecture, so a Windows-only release does not break Linux checks. Extracted portable and Debian builds update manually. Flatpak, RPM and ARM64 are not implemented. See LINUX-QUICKSTART.md for user instructions.

The manual **Experimental Linux source checks** workflow is available for a maintainer to run on Ubuntu. It tests source and renders the UI under Xvfb; it does not build, publish or install DriveDeck. It has not been dispatched during this change.

## Test coverage and remaining validation

Automated tests inject Linux process responses and PCM buffers; they do not control real music players. They cover backend selection, metadata and player selection, safe command arguments, seek bounds, missing helpers, recovery, stop/disconnect handling, real sine-wave FFT analysis, monitor-capture arguments, game paths and updater isolation. Existing Windows tests continue to run.

Still required on Linux: start the desktop under X11 and Wayland, test display/fullscreen/window sizing, connect native BeamNG and a Proton install, verify actual playerctl/parec permissions and output-device changes, test vehicle thumbnails, phone sharing/firewall access, decode animated artwork, build and launch AppImage/deb, and check behavior without optional dependencies.

Reference behavior: [playerctl](https://github.com/altdesktop/playerctl), [PulseAudio capture options](https://github.com/pulseaudio/pulseaudio/blob/master/man/pacat.1.xml.in), [BeamNG user folder](https://docs.beamng.com/support/userfolder/).
