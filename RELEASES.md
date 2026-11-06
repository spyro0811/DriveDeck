# Publishing DriveDeck for Windows

## One-time setup

1. Put this project in a GitHub source repository. `.github/workflows/release.yml` must be at the repository root. The workflow accepts the app at the root or in `drivedeck/`.
2. Choose a **public** GitHub repository for downloads. It can be the source repository, or a separate public downloads-only repository while source remains private.
3. Set `repository` in `release.config.json` to `YOUR-OWNER/YOUR-REPOSITORY`. No URL and no token. This value is baked into installers and cannot be changed in the app by a downloaded release.
4. If releases are in a different repository, add the Actions variable `RELEASE_REPOSITORY` with that same OWNER/REPOSITORY and an Actions secret `RELEASE_TOKEN`: a fine-grained GitHub token with Contents read/write on the downloads repository. If they share a repository, the workflow uses its scoped `GITHUB_TOKEN`; no extra secret is needed.
5. Enable GitHub Actions. Existing portable users must install Setup once to join automatic updates. Their settings and artwork stay in `%APPDATA%/drivedeck`; the installer preserves that location.

Never put a token in package.json, release.config.json, renderer code, Git, or a distributed app. Public clients read public releases without credentials.

## Publish a new version

1. Run `npm version 0.17.1 --no-git-tag-version` (use your next version), then commit the code and lockfile.
2. Push a matching tag, e.g. `v0.17.1`, or run **Build Windows release** from Actions → Run workflow. The tag must match package.json, and only stable x.y.z versions are accepted by this workflow.
3. The Windows job installs locked dependencies, runs tests, rebuilds the bundled BeamNG companion ZIP, builds Setup and update metadata, and creates a **draft** release. It refuses to overwrite an already published version.
4. Review the draft, add release notes, and test Setup on a spare Windows account/VM. Keep all three assets: `DriveDeck-Setup-VERSION.exe`, its `.exe.blockmap`, and `latest.yml`.
5. Publish the draft as the latest stable release. Drafts/prereleases are not offered to installed stable clients.

All update assets must belong to the same build. Do not edit latest.yml or replace an existing public installer; bump the version instead. A separate downloads repository does not need the source code or workflow.

## Local builds

- `npm ci`
- `npm test`
- `python scripts/package-companion.py`
- `npm run installer`: builds Setup locally without publishing. With repository unset, its updater clearly says no release repository is configured.
- `npm run release:build`: requires a configured feed and builds Setup, blockmap, and latest.yml. It **never uploads**. Upload those three files to a draft GitHub release manually if you prefer.
- `npm run portable`: builds the optional portable edition; it opens the download page for manual updates instead of trying to overwrite itself.

`DRIVEDECK_RELEASE_REPOSITORY=OWNER/REPOSITORY` overrides the config for CI builds. The workflow defaults to its source repository unless the `RELEASE_REPOSITORY` Actions variable is set. Ensure these destinations match your intended public download repository before your first public build. Keep the destination stable for the lifetime of existing installations.

## User update flow

Installed builds check once, four seconds after opening. When a stable update is available, a nonblocking notice offers Download update / Later. Download progress is shown; once verified, Restart and install is offered. No update downloads, installs on quit, or restarts without the user choosing it. Display → App updates includes a manual check and retry status. An offline startup does not interrupt the dashboard. Development and smoke builds never contact the update feed.

BeamNG companion files ship in every installer. Users can update the game companion through Connect → Install companion, with backups, then follow the reload instructions. App updates do not silently change the game’s mod folder. Companion version detection is not implemented in this release.

## Validation and signing

The local no-feed Setup can be built before your repository exists; public update delivery cannot be exercised until a real feed has two published versions. Test that path in a VM: install version A, publish version B, launch A, download B, then restart and verify settings/artwork persist. Never use someone else's repository as a test update feed.

Current builds are unsigned, matching the existing portable distribution. Windows may show an unknown-publisher/SmartScreen prompt. Before wider distribution, configure a code-signing identity in electron-builder and CI secrets; keep using that identity for later updates. Do not disable update checksum verification. The pinned electron-updater 6 / electron-builder 26 combination supports NSIS updates; review migration requirements before upgrading either major version.


## Linux-only release

Bump package.json and package-lock.json together, and write src/release-notes-linux.json. Run **Build Linux release** manually on the matching source, or push a `linux-vVERSION` tag. The shared Windows and Linux workflow responds to `vVERSION` tags and is not run by the Linux tag. For future shared releases it builds both platforms, waits for both to pass, and uploads one draft. This Linux-only workflow builds no Windows installer.

The Linux workflow builds an AppImage, Debian package, portable tar archive, latest-linux.yml and checksums. It verifies the actual AppImage under Xvfb and creates a draft only after checks pass. Test the AppImage on a Linux desktop before publishing. **Do not mark a Linux-only release as GitHub’s latest release**: existing Windows installations use that destination. Publish with the “Set as the latest release” checkbox unchecked (or `gh release edit linux-vVERSION --draft=false --latest=false`). Published releases are never overwritten.

Linux AppImages select the highest stable published version with matching Linux assets, including Linux-only tags and future shared `vVERSION` releases. They ignore drafts, prereleases and Windows-only releases. No credentials are embedded in the app. Existing experimental tar users must manually download the first update-enabled AppImage.
