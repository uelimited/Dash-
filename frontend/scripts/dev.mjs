import {spawn} from 'node:child_process';
import {createConnection} from 'node:net';
import {open,readFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const lock=path.join(root,'.dash-dev.lock');
const token=JSON.stringify({pid:process.pid,started:Date.now()});
function reachable(host){return new Promise(resolve=>{const socket=createConnection({host,port:3000});const finish=value=>{socket.destroy();resolve(value);};socket.setTimeout(500);socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.once('timeout',()=>finish(false));});}
async function acquire(){
  for(let attempt=0;attempt<2;attempt++){
    try{const file=await open(lock,'wx');await file.writeFile(token);await file.close();return;}
    catch(error){
      if(error.code!=='EEXIST')throw error;
      let previous;
      try{previous=JSON.parse(await readFile(lock,'utf8'));}catch{throw new Error('Dash startup is already in progress. Retry in a moment.');}
      try{process.kill(previous.pid,0);}catch(error){if(error.code==='ESRCH'){await unlink(lock);continue;}}
      throw new Error('Dash is already running. Open http://localhost:3000 instead of starting another server.');
    }
  }
  throw new Error('Could not acquire the Dash startup lock.');
}
let owned=false;
try{
  await acquire();owned=true;
  if((await Promise.all([reachable('127.0.0.1'),reachable('::1')])).some(Boolean))throw new Error('Port 3000 is already in use. Stop the existing server in its terminal before starting Dash.');
  const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3000'],{cwd:root,stdio:'inherit',windowsHide:true});
  const stop=()=>child.kill('SIGINT');
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??0));});
  process.exitCode=code;
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(owned&&await readFile(lock,'utf8').catch(()=>null)===token)await unlink(lock);}
