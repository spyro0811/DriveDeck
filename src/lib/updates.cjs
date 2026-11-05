const { EventEmitter } = require('node:events');
const { releaseNotes } = require('./release-notes.cjs');
// Only the repository baked into the signed/reviewed build may supply updates.
function validRepository(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(value) && !value.endsWith('/.') && !value.endsWith('/..');
}
class Updates extends EventEmitter {
  constructor({ updater, version, repository, packaged, portable, disabled = false, platform = process.platform, linuxAppImage = !!process.env.APPIMAGE, linuxRelease = require('./linux-release.cjs').latestLinuxRelease }) {
    super(); this.platform=platform;this.linuxRelease=linuxRelease; this.updater = updater; this.repository = validRepository(repository) ? repository : null;
    this.state = { status: 'idle', currentVersion: version, version: null, percent: 0, message: '', releaseNotes:'' };
    if (disabled || !packaged) this.state = {...this.state, status:'disabled', message:'Update checks are disabled in development and test builds.'};
    else if (!this.repository) this.state = {...this.state, status:'disabled', message:'This build is not connected to a release repository yet.'};
    else if (platform !== 'win32' && !(platform==='linux'&&linuxAppImage&&updater)) this.state={...this.state,status:'manual',message:'This Linux package uses manual updates. Download the AppImage edition for in-app updates.'};
    else if (portable) this.state = {...this.state, status:'manual', message:'Portable edition: install the latest Setup edition for automatic updates.'};
    if (['disabled','manual'].includes(this.state.status)) return;
    updater.autoDownload = false; updater.autoInstallOnAppQuit = false;
    updater.disableWebInstaller = true;
    updater.allowPrerelease = false; updater.allowDowngrade = false;
    updater.on('update-available', info => this.set({status:'available',version:String(info.version).slice(0,64),releaseNotes:releaseNotes(info.releaseNotes),percent:0,message:'A new version of DriveDeck is available.'}));
    updater.on('update-not-available', () => this.set({status:'idle',version:null,releaseNotes:'',message:'You’re up to date.'}));
    updater.on('download-progress', info => this.set({status:'downloading',percent:Math.max(0,Math.min(100,Number(info.percent)||0))}));
    updater.on('update-downloaded', () => this.set({status:'downloaded',percent:100,message:'Ready to restart and install. Your settings will be kept.'}));
    updater.on('error', () => this.fail());
  }
  snapshot() { return {...this.state}; }
  set(patch) { this.state={...this.state,...patch}; this.emit('state',this.snapshot()); }
  fail() { this.set({status:'error',message:'Could not complete the update. Check your connection and try again.'}); }
  async check() {
    if (['disabled','manual','checking','downloading','downloaded'].includes(this.state.status) || this.busy) return this.snapshot();
    this.busy=true; this.set({status:'checking',message:'Checking for updates…',percent:0});
    try { if(this.platform==='linux'){const release=await this.linuxRelease(this.repository);if(!release){this.set({status:'idle',version:null,message:'No published Linux update is available yet.'});return this.snapshot();}this.linuxReleaseUrl=release.page;this.updater.setFeedURL({provider:'generic',url:release.url,useMultipleRangeRequest:false});} await this.updater.checkForUpdates(); } catch { this.fail(); } finally { this.busy=false; }
    return this.snapshot();
  }
  async download() {
    if (this.state.status!=='available' || this.busy) return {ok:false};
    this.busy=true;this.set({status:'downloading',percent:0,message:'Downloading update…'});
    try { await this.updater.downloadUpdate(); return {ok:true}; } catch { this.fail();return {ok:false}; } finally { this.busy=false; }
  }
  install() {
    if(this.state.status!=='downloaded')return {ok:false};
    // Never restart automatically, including when the user closes the app.
    this.updater.quitAndInstall(false,true); return {ok:true};
  }
  get releasesUrl() { return this.linuxReleaseUrl||(this.repository ? `https://github.com/${this.repository}/releases${this.platform==='linux'?'':'/latest'}` : null); }
}
module.exports={Updates,validRepository};
