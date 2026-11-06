const path=require('node:path'),{releaseConfig}=require('./build-release.cjs');
function steamDeckConfig(repository){return {...releaseConfig(repository),extraMetadata:{releaseRepository:repository||null,version:'0.20.2-preview.4'},directories:{output:'dist/steamdeck'},linux:{executableName:'drivedeck',category:'Game',icon:'src/renderer/assets/icon.png'}};}
module.exports={steamDeckConfig};
if(require.main===module){const {build,Platform,Arch}=require('electron-builder');const repository=require('../release.config.json').repository;build({projectDir:path.resolve(__dirname,'..'),targets:Platform.LINUX.createTarget(['dir'],Arch.x64),publish:'never',config:steamDeckConfig(repository)}).catch(error=>{console.error(error);process.exitCode=1;});}
