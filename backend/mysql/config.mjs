import {readFileSync} from 'node:fs';
import path from 'node:path';
import {parse} from 'dotenv';

export function readConfig(envPath) {
  const root=path.basename(process.cwd())==='frontend'||path.basename(process.cwd())==='backend'?path.dirname(process.cwd()):process.cwd();
  const file=envPath||path.join(root,'backend','mysql','.env');
  let config={};
  try {config=parse(readFileSync(file));} catch {}
  if(!envPath)config={...config,...process.env};
  if(!config.MYSQL_USER||!config.MYSQL_PASSWORD||!config.MYSQL_DATABASE)throw new Error('MYSQL_NOT_CONFIGURED');
  return {host:config.MYSQL_HOST||'127.0.0.1',port:Number(config.MYSQL_PORT||3306),user:config.MYSQL_USER,password:config.MYSQL_PASSWORD,database:config.MYSQL_DATABASE,charset:'utf8mb4',connectTimeout:5000};
}
