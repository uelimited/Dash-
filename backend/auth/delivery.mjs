import {AsyncLocalStorage} from 'node:async_hooks';
const delivery=new AsyncLocalStorage();
// Better Auth deliberately catches mail callback failures. Track each request's
// outcome separately so our login endpoint cannot report a failed send as success.
export async function trackDelivery(send){
 const state=delivery.getStore();if(state)state.attempted=true;
 try{await send();}catch(error){if(state)state.error=error;throw error;}
}
export async function requireDelivery(action){
 return delivery.run({attempted:false,error:null},async()=>{
  const response=await action(),state=delivery.getStore();
  if(response.ok){
   if(state.error)throw state.error;
   if(!state.attempted)throw new Error('MAIL_NOT_ATTEMPTED');
  }
  return response;
 });
}
export function deliveryMessage(error){
 const messages={
  EMAILJS_SERVER_DISABLED:'EmailJS blocks server requests. Enable API access from non-browser applications in EmailJS Account → Security, then retry.',
  EMAILJS_PRIVATE_KEY_REQUIRED:'EmailJS requires a valid Private Key. Enter it through the local EmailJS setup.',
  EMAILJS_QUOTA:'EmailJS has reached its sending limit. Check the account quota and retry later.',
  EMAILJS_CONFIGURATION:'EmailJS rejected the service, template or recipient settings. Check the EmailJS template and connected email service.',
  MAIL_NOT_ATTEMPTED:'The admin account could not receive a code. Ask the administrator to check its database setup.',
  MAIL_DELIVERY_FAILED:'EmailJS could not send the code. Check the connected email service and Email History.',
  MAIL_NOT_CONFIGURED:'Complete the EmailJS settings before requesting a code.'
 };
 return messages[error?.message]||null;
}
