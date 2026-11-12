import {createInterface} from 'node:readline/promises';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {authDirectory,authSettings} from './config.mjs';
import {microsoftClient} from './mail.mjs';
const input=createInterface({input:process.stdin,output:process.stdout});
try{
  const tenantId=(await input.question('Microsoft Directory (tenant) ID: ')).trim();
  const clientId=(await input.question('Application (client) ID: ')).trim();
  if(!/^[\da-f-]{36}$/i.test(tenantId)||!/^[\da-f-]{36}$/i.test(clientId))throw new Error('Use the GUID identifiers from your Entra app registration, not your username or password.');
  const settings={...authSettings(),tenantId,clientId};
  const client=microsoftClient(settings);
  console.log('Sign in as '+settings.adminEmail+'. Microsoft will ask for permission to send mail as this account.');
  const result=await client.acquireTokenByDeviceCode({scopes:['https://graph.microsoft.com/Mail.Send'],deviceCodeCallback:message=>console.log(message.message)});
  if(result?.account?.username?.toLowerCase()!==settings.adminEmail)throw new Error('The signed-in mailbox must match the configured admin email.');
  const file=path.join(authDirectory(),'.env');let env=await readFile(file,'utf8');
  env=env.replace(/^MS_TENANT_ID=.*$/m,'MS_TENANT_ID='+tenantId).replace(/^MS_CLIENT_ID=.*$/m,'MS_CLIENT_ID='+clientId);
  await writeFile(file,env,{mode:0o600});
  console.log('Microsoft 365 is connected. Open http://localhost:3000/login and request your sign-in code.');
}catch(error){console.error(error.message?.startsWith('Use the GUID')||error.message?.startsWith('The signed-in')?error.message:'Microsoft connection did not complete. Check your app IDs, tenant policy and Mail.Send consent.');process.exitCode=1;}
finally{input.close();}
