import mysql from 'mysql2/promise';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readConfig} from './config.mjs';

const connection=await mysql.createConnection(readConfig(fileURLToPath(new URL('.env',import.meta.url))));
const testId=`connection-check-${randomUUID()}`;
try{
  await connection.beginTransaction();
  await connection.execute('INSERT INTO dash_projects (id,position,name,code,details) VALUES (?,0,?,?,?)',[testId,'Connection check','CHECK',JSON.stringify({id:testId})]);
  await connection.execute('INSERT INTO dash_records (project_id,register_name,id,position,record_data) VALUES (?,?,?,0,?)',[testId,'items','check-material',JSON.stringify({id:'check-material',name:'Test material',tds:'Approved',stage:'LOI sent'})]);
  const [test]=await connection.execute('SELECT record_data FROM dash_records WHERE project_id=?',[testId]);
  assert.equal(test.length,1);assert.equal(test[0].record_data.stage,'LOI sent');
  await connection.rollback();
  const [removed]=await connection.execute('SELECT id FROM dash_projects WHERE id=?',[testId]);
  assert.equal(removed.length,0);
  const [state]=await connection.query('SELECT version, initialized FROM dash_workspace WHERE id=1');
  const [counts]=await connection.query('SELECT register_name, COUNT(*) AS records FROM dash_records GROUP BY register_name');
  console.log('PASS: MySQL connection, project/record writes, JSON fields, and transaction rollback. No test records retained.');
  console.log(JSON.stringify({database:'dash',version:state[0].version,initialized:!!state[0].initialized,counts}));
}catch(error){await connection.rollback();console.error(`Database check failed: ${error.code||error.name}`);process.exitCode=1;}
finally{await connection.end();}
