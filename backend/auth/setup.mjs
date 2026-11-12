import mysql from 'mysql2';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {getMigrations} from 'better-auth/db/migration';
import {readConfig} from '../mysql/config.mjs';
import {authDirectory,authSettings} from './config.mjs';
import {authOptions} from './auth.mjs';

const password=(await new Promise(resolve=>{let data='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>data+=chunk);process.stdin.on('end',()=>resolve(data));})).replace(/\r?\n$/,'');
await mkdir(authDirectory(),{recursive:true});
const envFile=path.join(authDirectory(),'.env');
try{await readFile(envFile);}catch{await writeFile(envFile,`ADMIN_EMAIL=nanurao051@gmail.com\nAUTH_SECRET=${randomBytes(48).toString('hex')}\nAUTH_ORIGIN=http://localhost:3001\nEMAILJS_SERVICE_ID=\nEMAILJS_TEMPLATE_ID=\nEMAILJS_PUBLIC_KEY=\nEMAILJS_PRIVATE_KEY=\n`,{flag:'wx',mode:0o600});}
const pool=mysql.createPool({...readConfig(),user:'root',password,connectionLimit:2});
try{
  const settings=authSettings();
  const migrations=await getMigrations(authOptions(pool,settings,async()=>{throw new Error('Setup does not send emails.');}));
  await writeFile(path.join(authDirectory(),'schema.sql'),await migrations.compileMigrations());
  await migrations.runMigrations();
  // Better Auth's atomic verification locks use 43-character hashed IDs.
  await pool.promise().query('ALTER TABLE dash_auth_verification MODIFY id VARCHAR(255) NOT NULL');
  await pool.promise().query('CREATE TABLE IF NOT EXISTS dash_auth_throttle (bucket VARCHAR(64) NOT NULL PRIMARY KEY, window_start BIGINT NOT NULL, attempts INT NOT NULL) ENGINE=InnoDB');
  await pool.promise().execute('INSERT INTO dash_auth_user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,FALSE,NOW(3),NOW(3)) ON DUPLICATE KEY UPDATE name=VALUES(name)',[randomUUID(),'Dash administrator',settings.adminEmail]);
  console.log('Admin authentication tables are ready. Admin: '+settings.adminEmail+'. Complete the EmailJS configuration if it is not already connected.');
}catch(error){console.error('Authentication setup failed: '+(error.code||error.name));process.exitCode=1;}
finally{await pool.promise().end();}
