import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {authDirectory} from './config.mjs';
let key='';for await(const chunk of process.stdin)key+=chunk;
try{
 key=key.trim();if(!key||key.length>512||/[\s"]/.test(key))throw Error();
 const file=path.join(authDirectory(),'.env'),previous=await readFile(file,'utf8');
 const line='EMAILJS_PRIVATE_KEY="'+key+'"';
 await writeFile(file,/^EMAILJS_PRIVATE_KEY=.*$/m.test(previous)?previous.replace(/^EMAILJS_PRIVATE_KEY=.*$/m,()=>line):previous.trim()+'\n'+line+'\n',{mode:0o600});
 console.log('Private Key saved locally. Return to Dash and request a new code.');
}catch{console.error('Private Key was not saved. Check it and try again.');process.exitCode=1;}
