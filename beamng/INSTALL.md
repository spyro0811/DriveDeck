# DriveDeck 0.8 BeamNG companion

The companion provides the active drive mode, vehicle identity, ambient temperature, real navigation roads, approximate building outlines, vehicle position, and the currently selected in-game route. Basic speed/RPM still work with OutGauge alone.

## Install from the app

1. Open DriveDeck's **Connect** tab (gear icon).
2. Click **Install companion…** and select the user folder shown by **BeamNG Launcher → Manage User Folder → Open in Explorer**. On the inspected installation this is `C:/Users/rcomo/AppData/Local/BeamNG/BeamNG.drive/current`.
3. The installer adds `mods/drivedeck-companion.zip`. Previous DriveDeck companion files are moved to a dated folder under `drivedeck-backups/`. Unrelated mods are left alone.
4. Restart BeamNG after the first install. Confirm the companion is enabled in Mod Manager.
5. In **Options → Protocols**, enable **Other UDP protocols**. This is essential: enabling OutGauge alone does **not** load custom protocols.
6. Keep OutGauge enabled at `127.0.0.1:4444`, then spawn a vehicle or press **Ctrl + R**.
7. Turn DriveDeck demo off. Select **Vivace S** for the replica, or enable **Match Vivace automatically** in Design. Changing the drive mode **in BeamNG** now changes the deck label and illumination.

The app's demo mode selector previews the modes without sending controls to the game. In live use the app follows the game; it never substitutes a manually selected demo mode.

## Manual install

Copy `drivedeck-companion.zip` directly into `USER_FOLDER/mods/`. Do not extract the ZIP. Disable an older DriveDeck companion first, including `mods/unpacked/drivedeck`, so only one version sends packets.

For an unpacked development install, copy `drivedeck/` to `mods/unpacked/drivedeck/`. It must contain:

```text
lua/vehicle/protocols/drivedeck_cluster_v2.lua
lua/ge/extensions/drivedeck/map.lua
```

No original game file is replaced. To uninstall, disable/remove the DriveDeck companion in Mod Manager.

## Map behavior

The extension reads `map.getMap().nodes` and `core_groundMarkers.routePlanner.path`, the sources used by the installed game's minimap. The app draws those road segments and the player marker in its own style. It exports nearby roads (roughly 2.6 km in each axis, capped at 6,000 segments), follows the vehicle, and resends data periodically. Roads marked `hiddenInNavi` stay hidden. A blue route appears when BeamNG has an active navigation path.

This is a road map without terrain imagery or street-name labels. No external map service or invented real-world location is used. Demo mode has a separate, explicitly labeled sample network. Missing live map data shows an installation prompt; a lost connection dims the last map and labels it disconnected.

## Custom port

If another app uses port 4444, set a free port in DriveDeck and OutGauge. Change both **`M.getPort`** in `drivedeck_cluster_v2.lua` and **`PORT`** near the top of `lua/ge/extensions/drivedeck/map.lua` to the same value. Reload/restart BeamNG after changing companion files.

## Verification

Controller calls and graph access were checked against this computer's installed BeamNG 0.40.4 source. Automated Lua tests run both modules with game API mocks, including a changing drive mode and graph/route export. UDP and Electron tests verify that packets reach the correct instruments and map. These checks are separate from a live game-session test.

## Protocols

- `DDK2`: 196-byte little-endian vehicle packet. Includes the original values plus active mode key, mode label/color, ambient temperature, lights, pedals, odometer, and selected gear.
- `DDM1`: size-limited JSON datagrams for pose, chunked road batches, and routes. Road batches are assembled completely before replacing the displayed graph.
- Legacy `DDK1` and standard BeamNG OutGauge remain supported.

[BeamNG custom protocol documentation](https://docs.beamng.com/modding/protocols/)

## Updating from DriveDeck 0.4.2 or earlier

The 0.4.3 companion fixes fragmented roads. Replace the installed companion with this version. When safely parked, press Ctrl+L to reload Lua, wait for the UI, then Ctrl+R to reload the vehicle. The dashboard update alone cannot restore road edges omitted by the older exporter.

## Component damage and nearby traffic preview

The updated companion also reports component damage and nearby vehicles for Stability, Plaid Stability, Model S, and Model Three. Restart BeamNG after replacing the companion ZIP so both the game-engine extension and vehicle protocol reload.

Stability uses silver for healthy components, orange for reported damage, red for broken/disabled components, and gray for missing data. This is a generic component illustration rather than a model-specific mechanical scan. Unsupported components stay unavailable.

The driving view shows generic silhouettes at live relative vehicle positions within 120 metres, excluding vehicles on substantially different elevations. Traffic lights are shown only for nearby active game signals with a recognized current red/amber/green state and compatible approach direction. Reference road guides are illustrative. Static walls, pedestrians, camera feeds and driving assistance are not provided.

The Stability views also show named bumpers, doors, hood, trunk/hatch, fenders and quarter panels when the vehicle exposes part damage scores. Red body panels mean severe damage; a specific panel can remain unavailable on unsupported or differently named modded vehicles. The drivetrain and body layout remain a generic illustration.

Plaid movement follows current speed, freezes below the stationary threshold (0.3 m/s), and returns to Stationary on every stop. Wheel tread and rim animation follows vehicle speed in Clean, Stability and Plaid Stability. Nearby vehicle silhouettes and traffic lights use shaded perspective 3D geometry; they are generic shapes rather than exact models of the nearby vehicles.

Traffic layouts now remain in place through brief sensor interruptions, while expired actors are removed. A despawned or unreadable traffic object no longer cancels the entire surroundings packet. Traffic lamps are placed at linked physical scene objects rather than the signal controller's logical stopping point; lights without linked physical objects are omitted.

Road-based lane guides follow nearby navgraph segments and their widths. The guide uses the graph's lane configuration when supplied and otherwise estimates lane count from road width. It follows the most aligned connected road ahead, so branches at junctions and painted markings may differ from the visualization. This is a visualization, not lane detection or driving assistance.

Lane counting now uses explicit DecalRoad lane fields when they can be resolved. It does not trust the navgraph lane string as explicit data: BeamNG can generate that string from road width. Unresolved two-way roads conservatively display two lanes, and unresolved one-way roads one lane. The displayed driving width excludes excess shoulder/parking width. Wide roads without explicit metadata can therefore be underrepresented.

Traffic lights are restricted to the closest aligned signal approach, with duplicate physical lamp positions removed and at most two heads displayed. Lights from subsequent intersections are omitted. Drivetrain wheel animation mirrors left/right rotation, reverses in R, and limits visual spin rate to avoid the backward-spinning strobe illusion.
