// Run once against the configured hosted database before exposing the website.
import mysql from 'mysql2';
import {readFile} from 'node:fs/promises';
import {getMigrations} from 'better-auth/db/migration';
import {readConfig} from '../mysql/config.mjs';
import {authSettings} from './config.mjs';
import {authOptions} from './auth.mjs';
const settings=authSettings();
if(!settings.origin.startsWith('https://')||settings.secret.length<32||!settings.adminEmail)throw new Error('Configure production HTTPS origin, admin email and secret first.');
const pool=mysql.createPool({...readConfig(),connectionLimit:2});
try{
 const sql=await readFile(new URL('../mysql/schema.sql',import.meta.url),'utf8');
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await pool.promise().query(statement);
 const migrations=await getMigrations(authOptions(pool,settings,async()=>{throw new Error('Setup cannot send emails.');}));
 await migrations.runMigrations();
 await pool.promise().query('ALTER TABLE dash_auth_verification MODIFY id VARCHAR(255) NOT NULL');
 await pool.promise().query('CREATE TABLE IF NOT EXISTS dash_auth_throttle (bucket VARCHAR(64) NOT NULL PRIMARY KEY, window_start BIGINT NOT NULL, attempts INT NOT NULL) ENGINE=InnoDB');
 console.log('Hosted schema ready. Run auth/sync-invited.mjs, then privately import workspace records.');
}finally{await pool.promise().end();}
