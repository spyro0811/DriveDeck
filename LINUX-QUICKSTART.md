# DriveDeck for Linux and Steam Deck

Download the **x64 AppImage** for Steam Deck or another x86-64 Linux desktop. Save it in a permanent folder you can write to. In your file manager, open Properties → Permissions and allow the file to run as a program, then open it. Run DriveDeck natively; do not enable Proton for DriveDeck. You may add the AppImage to Steam as a non-Steam game.

The AppImage supports update checks, downloads and **Restart and install** inside DriveDeck. Downloads and restarts require your click. Settings are preserved. Experimental portable builds need one manual download of this AppImage to gain in-app updating.

The Debian package is for Debian/Ubuntu systems, not SteamOS. The `.tar.gz` archive is a portable fallback: extract it and launch `drivedeck`. Debian and extracted portable packages use manual updates. SteamOS users should not modify the read-only system to install the Debian package.

## BeamNG companion

1. Run BeamNG at least once. It may run natively or through Proton.
2. In DriveDeck, open Connect → Install companion. Select **Proton** if BeamNG runs through Proton; choose the folder in the same Steam library as the game. SD-card libraries are detected.
3. Fully restart BeamNG. Enable the companion in Mod Manager, enable **Other UDP protocols**, then reload the vehicle.

Roads/navigation and vehicle identity use separate parts of the companion. If roads appear but Model S/Model Three cannot identify the car, check Other UDP protocols. The install status shows the folder receiving the companion.

## Music and decks

Use a desktop music player that exposes MPRIS. DriveDeck reads playback state through playerctl or the desktop D-Bus service. Visualizers capture the output monitor through parec or PipeWire; they do not record the microphone. Local or HTTPS album artwork colors Ultra Sound, Ultra Levels and media-player visualizers. No music is bundled or streamed to the phone dashboard.

**Arch BTW** is in the Linux deck library: analog RPM, speed, gear, and “I use arch btw”.

This first Linux release has limited distribution coverage. Steam Deck feedback confirms basic telemetry, audio and navigation; report your OS, BeamNG compatibility mode and package type with any problem.
