const { contextBridge, ipcRenderer } = require('electron');
const subscribe = channel => callback => {
  const handler = (_event, data) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};
contextBridge.exposeInMainWorld('driveDeck', {
  onCamera:subscribe('camera:frame'),
  cameraInterest:value=>ipcRenderer.invoke('camera:interest',value),
  openPhoneLink:()=>ipcRenderer.invoke('notifications:phone-link'),
  notificationStatus:()=>ipcRenderer.invoke('notifications:status'),notificationHistory:()=>ipcRenderer.invoke('notifications:history'),enableNotifications:()=>ipcRenderer.invoke('notifications:enable'),openNotificationPermissions:()=>ipcRenderer.invoke('notifications:permissions'),onNotification:subscribe('notifications:received'),onNotificationState:subscribe('notifications:state'),onNotificationReset:subscribe('notifications:reset'),
  openMobileInstructions: () => ipcRenderer.invoke('mobile:instructions'),
  mobileStatus: () => ipcRenderer.invoke('mobile:status'),
  startMobile: () => ipcRenderer.invoke('mobile:start'),
  stopMobile: () => ipcRenderer.invoke('mobile:stop'),
  acknowledgeReleaseNotes: () => ipcRenderer.invoke('release:acknowledge'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  openReleases: () => ipcRenderer.invoke('updates:releases'),
  onUpdates: subscribe('updates:state'),
  vehiclePreview: id => ipcRenderer.invoke('vehicle:preview',id),
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  updateSettings: patch => ipcRenderer.invoke('settings:update', patch),
  retryAnimation: () => ipcRenderer.invoke('animation:retry'),
  animationFailed: (source,key) => ipcRenderer.invoke('animation:failed',source,key),
  addCanvasClip: () => ipcRenderer.invoke('animation:add-canvas'),
  removeCanvasClip: () => ipcRenderer.invoke('animation:remove-canvas'),
  openAnimationSource: () => ipcRenderer.invoke('animation:open-source'),
  onAnimation: subscribe('animation:state'),
  seekMedia: seconds => ipcRenderer.invoke('media:seek', seconds),
  mediaCommand: action => ipcRenderer.invoke('media:command', action),
  setResolution: (width,height) => ipcRenderer.invoke('window:resolution',width,height),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  getDisplays: () => ipcRenderer.invoke('window:displays'),
  moveToDisplay: id => ipcRenderer.invoke('window:move', id),
  exportSettings: () => ipcRenderer.invoke('settings:export'),
  importSettings: () => ipcRenderer.invoke('settings:import'),
  openCompanion: () => ipcRenderer.invoke('beamng:companion'),
  installCompanion: () => ipcRenderer.invoke('beamng:install'),
  onTelemetry: subscribe('telemetry:state'), onMedia: subscribe('media:state'),
  onAudio: subscribe('audio:state'),
  onMap: subscribe('map:state'),
  onSettings: subscribe('settings:changed'), onFullscreen: subscribe('window:fullscreen-changed'),
});

