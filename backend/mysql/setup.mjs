import mysql from 'mysql2/promise';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {readConfig} from './config.mjs';

// Root password arrives privately on stdin; it is never logged or saved.
const password=(await new Promise(resolve=>{let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',part=>input+=part);process.stdin.on('end',()=>resolve(input));})).replace(/\r?\n$/,'');
const envFile=fileURLToPath(new URL('.env',import.meta.url));
let connection;
try {
  connection=await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password,connectTimeout:5000});
  await connection.query('CREATE DATABASE IF NOT EXISTS dash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.changeUser({database:'dash'});
  const schema=await readFile(new URL('schema.sql',import.meta.url),'utf8');
  for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))await connection.query(statement);
  let config;
  try{config=readConfig(envFile);}catch{config=null;}
  if(!config){
    const [existing]=await connection.execute("SELECT User FROM mysql.user WHERE User='dash_app'");
    if(existing.length)throw Object.assign(new Error('Existing dash_app account has no matching local configuration. It was not changed.'),{code:'APP_USER_EXISTS'});
    const appPassword=randomBytes(32).toString('hex');
    await connection.query("CREATE USER 'dash_app'@'localhost' IDENTIFIED BY ?",[appPassword]);
    await writeFile(envFile,`MYSQL_HOST=127.0.0.1\nMYSQL_PORT=3306\nMYSQL_DATABASE=dash\nMYSQL_USER=dash_app\nMYSQL_PASSWORD=${appPassword}\n`,{flag:'wx',mode:0o600});
    config=readConfig(envFile);
  }
  await connection.query("GRANT SELECT, INSERT, UPDATE, DELETE ON dash.* TO 'dash_app'@'localhost'");
  const app=await mysql.createConnection(config);
  try {await app.query('SELECT version FROM dash_workspace WHERE id=1');}finally{await app.end();}
  console.log('MySQL connected successfully. Database: dash. App account: dash_app. Root password was not saved.');
}catch(error){
  const messages={ER_ACCESS_DENIED_ERROR:'MySQL rejected the root password. Run setup again and enter your installation password.',ECONNREFUSED:'MySQL is not reachable on 127.0.0.1:3306.',APP_USER_EXISTS:'The dash_app account already exists, but its local configuration is missing. No account was overwritten.'};
  console.error(messages[error.code]||`Setup did not complete (${error.code||'configuration error'}). No existing project records were deleted.`);
  process.exitCode=1;
}finally{await connection?.end();}
