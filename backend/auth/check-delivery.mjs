import assert from 'node:assert/strict';
import {requireDelivery,trackDelivery,deliveryMessage} from './delivery.mjs';
import {sendAdminOTP} from './mail.mjs';
const fake={adminEmail:'admin@example.invalid',emailjsServiceId:'service-test',emailjsTemplateId:'template-test',emailjsPublicKey:'public-test'};
const response=()=>Response.json({ok:true});
await assert.rejects(()=>requireDelivery(async()=>{try{await trackDelivery(async()=>{throw Error('EMAILJS_SERVER_DISABLED');});}catch{}return response();}),/EMAILJS_SERVER_DISABLED/);
await assert.rejects(()=>requireDelivery(async()=>response()),/MAIL_NOT_ATTEMPTED/);
const results=await Promise.allSettled([
 requireDelivery(async()=>{await trackDelivery(async()=>{});return response();}),
 requireDelivery(async()=>{try{await trackDelivery(async()=>{throw Error('MAIL_DELIVERY_FAILED');});}catch{}return response();})
]);
assert.deepEqual(results.map(r=>r.status),['fulfilled','rejected']);
await assert.rejects(()=>sendAdminOTP(fake,fake.adminEmail,'123456',async()=>new Response('API access from non-browser environments is currently disabled.',{status:403})),/EMAILJS_SERVER_DISABLED/);
assert.match(deliveryMessage(Error('EMAILJS_SERVER_DISABLED')),/non-browser/);
assert.equal(deliveryMessage(Error('untrusted provider response')),null);
console.log('PASS: swallowed delivery errors are detected, concurrent requests stay isolated, missing sends fail closed, and provider errors are safely classified. No real email sent.');
