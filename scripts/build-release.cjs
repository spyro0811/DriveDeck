const path=require('node:path');
const {validRepository}=require('../src/lib/updates.cjs');
function releaseConfig(repository) {
  if(repository && !validRepository(repository))throw new Error('Release repository must be OWNER/REPOSITORY on github.com.');
  return {extraMetadata:{releaseRepository:repository||null},publish:repository?[{provider:'github',owner:repository.split('/')[0],repo:repository.split('/')[1],releaseType:'draft'}]:null};
}
module.exports={releaseConfig};
if(require.main===module){
  const repository=process.env.DRIVEDECK_RELEASE_REPOSITORY||require('../release.config.json').repository;
  if(process.argv.includes('--require-feed')&&!repository)throw new Error('Set repository in release.config.json or DRIVEDECK_RELEASE_REPOSITORY before making a public release.');
  const {build,Platform}=require('electron-builder');
  build({projectDir:path.resolve(__dirname,'..'),targets:Platform.WINDOWS.createTarget(process.argv.includes('--portable')?['portable']:['nsis']),publish:'never',config:releaseConfig(repository)}).catch(e=>{console.error(e);process.exitCode=1;});
}
