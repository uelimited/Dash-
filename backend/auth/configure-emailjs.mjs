import {readFile,writeFile} from 'node:fs/promises';
import {parse} from 'dotenv';
import path from 'node:path';
import {authDirectory} from './config.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
try{
 const values=JSON.parse(input),file=path.join(authDirectory(),'.env');
 const settings=parse(await readFile(file));
 for(const key of ['EMAILJS_SERVICE_ID','EMAILJS_TEMPLATE_ID','EMAILJS_PUBLIC_KEY'])if(typeof values[key]!=='string'||!values[key].trim())throw Error('Required setting missing.');
 for(const key of ['EMAILJS_SERVICE_ID','EMAILJS_TEMPLATE_ID','EMAILJS_PUBLIC_KEY','EMAILJS_PRIVATE_KEY'])settings[key]=String(values[key]||'').trim();
 if(Object.values(settings).some(v=>/[\r\n"]/.test(v)))throw Error('Invalid configuration value.');
 await writeFile(file,Object.entries(settings).map(([k,v])=>`${k}="${v}"`).join('\n')+'\n',{mode:0o600});
 console.log('EmailJS settings saved privately. Refresh the admin login page to request a code.');
}catch{console.error('Settings were not saved. Check all required fields and try again.');process.exitCode=1;}
