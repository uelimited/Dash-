import assert from 'node:assert/strict';
import {makeAuthHandler} from './handler.mjs';
import {authSettings,isInvited} from './config.mjs';
import {sendAdminOTP} from './mail.mjs';
const settings={...authSettings(),origin:'https://dash.example',allowedOrigins:['https://dash.example'],adminEmail:'admin@example.invalid',viewerEmails:['viewer@example.invalid'],requireLogin:true};
assert.equal(isInvited(settings,'VIEWER@example.invalid'),true);
assert.equal(isInvited(settings,'outsider@example.invalid'),false);
let captured;
await sendAdminOTP({...settings,emailjsServiceId:'test',emailjsTemplateId:'test',emailjsPublicKey:'test'},'viewer@example.invalid','123456',async(_url,options)=>{captured=JSON.parse(options.body);return new Response('OK');});
assert.equal(captured.template_params.to_email,'viewer@example.invalid');
assert.equal(captured.template_params.passcode,'123456');
const viewer={user:{email:'viewer@example.invalid',emailVerified:true}};
for(const [session,admin,canView,canEdit] of [[null,null,false,false],[viewer,null,true,false],[viewer,viewer,true,true]]){
 const handle=makeAuthHandler({authSettings:()=>settings,getViewer:async()=>session,getAdmin:async()=>admin});
 const result=await handle(new Request(settings.origin+'/api/auth/access')).then(r=>r.json());
 assert.equal(result.canView,canView);assert.equal(result.canEdit,canEdit);
}
const failed=makeAuthHandler({authSettings:()=>settings,getViewer:async()=>{throw Error('offline');}});
assert.equal((await failed(new Request(settings.origin+'/api/auth/access')).then(r=>r.json())).canView,false);
console.log('PASS: invite allowlist, correct viewer OTP recipient, separate read/edit permissions and fail-closed access. No real email sent.');
