import {getAdmin,getViewer} from '../../../../backend/auth/auth.mjs';
import {authSettings} from '../../../../backend/auth/config.mjs';
import {workspaceOperation,databaseError} from '../../../../backend/mysql/workspace';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};


async function handle(request:Request){
  try{
    const url=new URL(request.url),host=request.headers.get('host');
    const settings=authSettings();
    if(!settings.allowedOrigins.includes(url.origin)||!host||!settings.allowedOrigins.some((value:string)=>new URL(value).host===host))return Response.json({error:'Request origin is not allowed.'},{status:403,headers});
    if(settings.requireLogin&&!await getViewer(request.headers))return Response.json({error:'Sign in with an invited email to view projects.'},{status:401,headers});
    const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
    if(site==='cross-site'||(origin&&origin!==url.origin))return Response.json({error:'Request origin is not allowed.'},{status:403,headers});
    if(request.method!=='GET'){
      try{if(!await getAdmin(request.headers))return Response.json({error:'Admin login is required to make changes.'},{status:401,headers});}
      catch{return Response.json({error:'Admin verification is unavailable. Please try again.'},{status:503,headers});}
    }
    let input;
    if(request.method!=='GET'){
      if(request.headers.get('x-dash-request')!=='1'||!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Invalid request.'},{status:403,headers});
      // Bound incoming snapshots without relying on the client Content-Length header.
      const reader=request.body?.getReader();
      if(!reader)return Response.json({error:'Missing request body.'},{status:400,headers});
      const chunks:Uint8Array[]=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20*1024*1024){await reader.cancel();return Response.json({error:'Import is larger than 20 MB.'},{status:413,headers});}chunks.push(value);}
      input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    return Response.json(await workspaceOperation(request.method,input),{headers});
  }catch(error){const result=databaseError(error);return Response.json({error:result.error},{status:result.status,headers});}
}
export {handle as GET,handle as POST,handle as PATCH,handle as PUT,handle as DELETE};
