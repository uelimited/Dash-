import {randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import {readConfig} from '../mysql/config.mjs';
import {authSettings} from './config.mjs';
const settings=authSettings();
const emails=[...new Set([settings.adminEmail,...settings.viewerEmails])];
if(emails.some(e=>!/^\S+@\S+\.\S+$/.test(e)))throw new Error('Invalid invited email configuration');
const db=await mysql.createConnection(readConfig());
try{
 for(const email of emails)await db.execute('INSERT INTO dash_auth_user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,FALSE,NOW(3),NOW(3)) ON DUPLICATE KEY UPDATE name=VALUES(name)',[randomUUID(),email===settings.adminEmail?'Dash administrator':'Dash teammate',email]);
 console.log('Invited accounts prepared. No emails were sent. Removed emails lose access immediately through the server allowlist.');
}finally{await db.end();}
