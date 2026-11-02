export class UpdatesView {
 constructor(api,root=document){
  this.api=api;this.root=root;this.dismissed=false;
  this.get('update-dismiss').onclick=()=>{this.dismissed=true;this.render(this.state)};
  this.get('update-check').onclick=()=>this.act('checkUpdates');
  this.get('update-action').onclick=()=>this.action();this.get('update-settings-action').onclick=()=>this.action();
  if(this.get('installed-notes-open'))this.get('installed-notes-open').onclick=()=>this.showInstalled(this.currentRelease);
  if(this.get('installed-notes-close'))this.get('installed-notes-close').onclick=()=>this.get('installed-notes').close();
  this.get('installed-notes')?.addEventListener('close',()=>{void api.acknowledgeReleaseNotes?.();});
  api.onUpdates?.(state=>this.render(state));
 }
 showInstalled(release){if(!release)return;this.currentRelease=release;this.get('installed-notes-title').textContent=`What’s new · DriveDeck ${release.version}`;this.get('installed-notes-copy').textContent=release.notes||'No patch notes are available.';if(!this.get('installed-notes').open)this.get('installed-notes').showModal();}
 get(id){return this.root.getElementById(id)}
 async act(method){this.dismissed=false;try{const state=await this.api[method]?.();if(method==='checkUpdates'&&state)this.render(state);}catch{this.render({...this.state,status:'error',message:'Could not complete the update. Try again later.'})}}
 action(){const s=this.state?.status;return this.act(s==='available'?'downloadUpdate':s==='downloaded'?'installUpdate':s==='manual'?'openReleases':'checkUpdates')}
 render(state={status:'disabled',message:'Updates are unavailable in this preview.'}){
  this.state=state;const notes=this.get('update-notes');if(notes){notes.textContent=state.releaseNotes||'Patch notes are unavailable. View this release on GitHub for details.';this.get('update-notes-section').hidden=!['available','downloading','downloaded'].includes(state.status);}const busy=['checking','downloading'].includes(state.status),active=['available','downloading','downloaded'].includes(state.status);
  const label=state.status==='available'?'Download update':state.status==='downloaded'?'Restart and install':state.status==='downloading'?`Downloading ${Math.floor(state.percent||0)}%`:state.status==='manual'?'Open downloads':state.status==='checking'?'Checking…':'Try again';
  this.get('update-banner').hidden=!active||this.dismissed;
  this.get('update-title').textContent=state.status==='downloaded'?'Update ready to install':`DriveDeck ${state.version||''} ${state.status==='downloading'?'is downloading':'is available'}`;
  this.get('update-message').textContent=state.message||'';
  this.get('update-status').textContent=state.status==='downloading'?`Downloading update: ${Math.floor(state.percent||0)}%`:state.message||'Check for a newer version of DriveDeck.';
  for(const id of ['update-action','update-settings-action']){const b=this.get(id);b.textContent=label;b.disabled=busy;b.hidden=state.status==='disabled'||(id==='update-settings-action'&&!active&&state.status!=='manual'&&state.status!=='error');}
  this.get('update-check').disabled=busy||['disabled','manual','downloaded'].includes(state.status);
 }
}
