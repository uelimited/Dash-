import {trackDelivery} from './delivery.mjs';
import {betterAuth} from 'better-auth';
import {emailOTP} from 'better-auth/plugins';
import {MysqlDialect} from 'kysely';
import mysql from 'mysql2';
import {readConfig} from '../mysql/config.mjs';
import {authSettings,isInvited} from './config.mjs';
import {sendAdminOTP} from './mail.mjs';

export function authOptions(pool,settings,sendOTP){
  return {
    appName:'Dash',baseURL:settings.origin,basePath:'/api/auth',secret:settings.secret,
    trustedOrigins:settings.allowedOrigins||[settings.origin],
    database:{dialect:new MysqlDialect({pool}),type:'mysql',transaction:true},
    user:{modelName:'dash_auth_user'},account:{modelName:'dash_auth_account'},verification:{modelName:'dash_auth_verification'},
    session:{modelName:'dash_auth_session',expiresIn:30*24*60*60,disableSessionRefresh:true,cookieCache:{enabled:false}},
    emailAndPassword:{enabled:false},
    rateLimit:{enabled:true,storage:'database',modelName:'dash_auth_rate_limit',window:60,max:30,customRules:{'/email-otp/send-verification-otp':{window:60,max:3},'/sign-in/email-otp':{window:60,max:10}}},
    advanced:{cookiePrefix:'dash',useSecureCookies:settings.origin.startsWith('https://'),defaultCookieAttributes:{httpOnly:true,sameSite:'lax'}},
    databaseHooks:{session:{create:{before:async(session,context)=>{
      const remember=context?.headers?.get('x-dash-remember')==='1';
      return {data:{...session,expiresAt:new Date(Date.now()+(remember?30*24:8)*60*60*1000)}};
    }}}},
    plugins:[emailOTP({otpLength:6,expiresIn:300,allowedAttempts:3,storeOTP:'hashed',disableSignUp:true,sendVerificationOTP:async({email,otp,type})=>{
      if(type!=='sign-in'||!isInvited(settings,email))throw new Error('ADMIN_ONLY');
      await trackDelivery(()=>sendOTP(email,otp));
    }})],logger:{disabled:true}
  };
}
export function createAdminAuth(pool,settings,sendOTP){return betterAuth(authOptions(pool,settings,sendOTP));}
export function getAuth(){
  const settings=authSettings();
  if(settings.secret.length<32||!settings.adminEmail)throw new Error('AUTH_NOT_CONFIGURED');
  const signature=JSON.stringify({deliveryVersion:4,...settings});
  if(!globalThis.dashAdminAuth||globalThis.dashAdminAuthSignature!==signature){
    globalThis.dashAdminPool??=mysql.createPool({...readConfig(),connectionLimit:5});
    globalThis.dashAdminAuth=createAdminAuth(globalThis.dashAdminPool,settings,(email,otp)=>sendAdminOTP(settings,email,otp));
    globalThis.dashAdminAuthSignature=signature;
  }
  return globalThis.dashAdminAuth;
}
export async function getAdmin(headers){
  const session=await getAuth().api.getSession({headers});
  return session?.user?.emailVerified&&session.user.email.toLowerCase()===authSettings().adminEmail?session:null;
}
export async function consumeThrottle(key,seconds,max){
  getAuth();
  const connection=await globalThis.dashAdminPool.promise().getConnection();
  try{
    await connection.beginTransaction();
    await connection.execute('INSERT IGNORE INTO dash_auth_throttle (bucket,window_start,attempts) VALUES (?,0,0)',[key]);
    const [rows]=await connection.execute('SELECT window_start,attempts FROM dash_auth_throttle WHERE bucket=? FOR UPDATE',[key]);
    const now=Math.floor(Date.now()/1000),expired=now-Number(rows[0].window_start)>=seconds;
    const count=expired?0:Number(rows[0].attempts);
    if(count>=max){await connection.rollback();return false;}
    await connection.execute('UPDATE dash_auth_throttle SET window_start=?,attempts=? WHERE bucket=?',[expired?now:rows[0].window_start,count+1,key]);
    await connection.commit();return true;
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export async function getViewer(headers){
 const session=await getAuth().api.getSession({headers});
 return session?.user?.emailVerified&&isInvited(authSettings(),session.user.email)?session:null;
}
