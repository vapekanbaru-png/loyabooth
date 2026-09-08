const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'loyabooth.sqlite');
const SECRET_KEY = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const db = new sqlite3.Database(DB_FILE);
const PLANS = {
  starter: { deviceLimit: 1, eventLimit: 5, photoLimit: 500, aiLimit: 50 },
  pro: { deviceLimit: 3, eventLimit: null, photoLimit: null, aiLimit: 2000 },
  lifetime: { deviceLimit: 5, eventLimit: null, photoLimit: null, aiLimit: null },
};

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));

function run(sql, params=[]) { return new Promise((resolve,reject)=>db.run(sql,params,function(e){e?reject(e):resolve({id:this.lastID,changes:this.changes})})); }
function get(sql, params=[]) { return new Promise((resolve,reject)=>db.get(sql,params,(e,row)=>e?reject(e):resolve(row))); }
function all(sql, params=[]) { return new Promise((resolve,reject)=>db.all(sql,params,(e,rows)=>e?reject(e):resolve(rows))); }
async function initDb() {
 await run('PRAGMA journal_mode=WAL');
 await run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, business_name TEXT NOT NULL, plan TEXT NOT NULL, created_at INTEGER NOT NULL)`);
 await run(`CREATE TABLE IF NOT EXISTS devices(id INTEGER PRIMARY KEY, device_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL, status TEXT NOT NULL, last_seen INTEGER, created_at INTEGER NOT NULL)`);
 await run(`CREATE TABLE IF NOT EXISTS activation_codes(id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER)`);
 await run(`CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, public_id TEXT UNIQUE NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL, event_date TEXT NOT NULL, theme TEXT NOT NULL, created_at INTEGER NOT NULL)`);
 await run(`CREATE TABLE IF NOT EXISTS photos(id INTEGER PRIMARY KEY, public_id TEXT UNIQUE NOT NULL, event_id INTEGER NOT NULL, user_id INTEGER NOT NULL, kind TEXT NOT NULL, filename TEXT NOT NULL, created_at INTEGER NOT NULL)`);
}
const ready = initDb();
function auth(req,res,next){const token=(req.headers.authorization||'').replace(/^Bearer\s+/,'');if(!token)return res.status(401).json({message:'Token wajib'});try{req.user=jwt.verify(token,SECRET_KEY);next()}catch{return res.status(403).json({message:'Token tidak valid'})}}
function tokenFor(user){return jwt.sign({id:user.id,username:user.username,plan:user.plan},SECRET_KEY,{expiresIn:'7d'})}
async function userPlan(userId){const u=await get('SELECT plan FROM users WHERE id=?',[userId]);return PLANS[u.plan]||PLANS.starter}
function currentMonthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).getTime()}
function code(len=8){return crypto.randomBytes(len).toString('hex').slice(0,len).toUpperCase()}

app.get('/health',async(_req,res)=>{await ready;res.json({ok:true,service:'loyabooth-api',version:'1.0.0'})});
app.post('/register',async(req,res)=>{await ready;const {username,password,business_name='Workspace Baru',plan='starter'}=req.body;if(!username||!password||password.length<8||!PLANS[plan])return res.status(400).json({message:'Data registrasi tidak valid'});try{const hash=await bcrypt.hash(password,12);const r=await run('INSERT INTO users(username,password,business_name,plan,created_at) VALUES(?,?,?,?,?)',[username.toLowerCase(),hash,business_name,plan,Date.now()]);res.status(201).json({token:tokenFor({id:r.id,username,plan}),user:{id:r.id,username,business_name,plan}})}catch(e){res.status(409).json({message:'Username sudah digunakan'})}});
app.post('/login',async(req,res)=>{await ready;const u=await get('SELECT * FROM users WHERE username=?',[(req.body.username||'').toLowerCase()]);if(!u||!(await bcrypt.compare(req.body.password||'',u.password)))return res.status(401).json({message:'Kredensial tidak valid'});res.json({token:tokenFor(u),user:{id:u.id,username:u.username,business_name:u.business_name,plan:u.plan}})});
app.get('/me',auth,async(req,res)=>{await ready;const u=await get('SELECT id,username,business_name,plan,created_at FROM users WHERE id=?',[req.user.id]);res.json(u)});
app.get('/usage',auth,async(req,res)=>{await ready;const p=await userPlan(req.user.id), month=currentMonthStart();const devices=(await get("SELECT COUNT(*) n FROM devices WHERE user_id=? AND status!='revoked'",[req.user.id])).n;const events=(await get('SELECT COUNT(*) n FROM events WHERE user_id=? AND created_at>=?',[req.user.id,month])).n;const ai=(await get("SELECT COUNT(*) n FROM photos WHERE user_id=? AND kind='ai' AND created_at>=?",[req.user.id,month])).n;const photos=(await get('SELECT COUNT(*) n FROM photos WHERE user_id=? AND created_at>=?',[req.user.id,month])).n;res.json({used:{devices,events,ai,photos},limits:p})});
app.post('/device/codes',auth,async(req,res)=>{await ready;const p=await userPlan(req.user.id);const count=(await get("SELECT COUNT(*) n FROM devices WHERE user_id=? AND status!='revoked'",[req.user.id])).n;if(count>=p.deviceLimit)return res.status(409).json({message:'Batas perangkat tercapai'});const activationCode=code(8);const expiresAt=Date.now()+10*60*1000;await run('INSERT INTO activation_codes(code,name,user_id,expires_at) VALUES(?,?,?,?)',[activationCode,req.body.name||'Kiosk Baru',req.user.id,expiresAt]);res.status(201).json({code:activationCode,expires_at:expiresAt})});
app.post('/device/activate',async(req,res)=>{await ready;const c=await get('SELECT * FROM activation_codes WHERE code=?',[String(req.body.code||'').toUpperCase()]);if(!c||c.used_at||c.expires_at<Date.now())return res.status(400).json({message:'Kode tidak valid atau kedaluwarsa'});const raw=crypto.randomBytes(32).toString('hex'), deviceId='LYB-'+code(12);await run('INSERT INTO devices(device_id,name,user_id,token_hash,status,last_seen,created_at) VALUES(?,?,?,?,?,?,?)',[deviceId,c.name,c.user_id,crypto.createHash('sha256').update(raw).digest('hex'),'online',Date.now(),Date.now()]);await run('UPDATE activation_codes SET used_at=? WHERE id=?',[Date.now(),c.id]);res.status(201).json({device_id:deviceId,device_token:raw,name:c.name})});
app.get('/devices',auth,async(req,res)=>{await ready;res.json({devices:await all('SELECT device_id,name,status,last_seen,created_at FROM devices WHERE user_id=? ORDER BY id DESC',[req.user.id])})});
app.post('/devices/:id/revoke',auth,async(req,res)=>{await ready;const r=await run("UPDATE devices SET status='revoked' WHERE device_id=? AND user_id=?",[req.params.id,req.user.id]);res.status(r.changes?200:404).json({success:!!r.changes})});
app.post('/device/heartbeat',async(req,res)=>{await ready;const hash=crypto.createHash('sha256').update(req.body.device_token||'').digest('hex');const r=await run("UPDATE devices SET status='online',last_seen=? WHERE device_id=? AND token_hash=? AND status!='revoked'",[Date.now(),req.body.device_id,hash]);res.status(r.changes?200:401).json({ok:!!r.changes,server_time:Date.now()})});
app.post('/events',auth,async(req,res)=>{await ready;const p=await userPlan(req.user.id),month=currentMonthStart();if(p.eventLimit!==null&&(await get('SELECT COUNT(*) n FROM events WHERE user_id=? AND created_at>=?',[req.user.id,month])).n>=p.eventLimit)return res.status(409).json({message:'Kuota event bulan ini habis'});const id=crypto.randomUUID();await run('INSERT INTO events(public_id,user_id,name,event_date,theme,created_at) VALUES(?,?,?,?,?,?)',[id,req.user.id,req.body.name,req.body.event_date,req.body.theme||'nusantara',Date.now()]);res.status(201).json({id,name:req.body.name,event_date:req.body.event_date,theme:req.body.theme||'nusantara'})});
app.get('/events',auth,async(req,res)=>{await ready;res.json({events:await all('SELECT public_id id,name,event_date,theme,created_at FROM events WHERE user_id=? ORDER BY id DESC',[req.user.id])})});
app.post('/events/:id/photos',auth,async(req,res)=>{await ready;const event=await get('SELECT id FROM events WHERE public_id=? AND user_id=?',[req.params.id,req.user.id]);if(!event)return res.status(404).json({message:'Event tidak ditemukan'});const p=await userPlan(req.user.id),month=currentMonthStart(),kind=req.body.kind==='ai'?'ai':'standard';const used=(await get(`SELECT COUNT(*) n FROM photos WHERE user_id=? AND created_at>=? ${kind==='ai'?"AND kind='ai'":''}`,[req.user.id,month])).n;const limit=kind==='ai'?p.aiLimit:p.photoLimit;if(limit!==null&&used>=limit)return res.status(409).json({message:'Kuota foto habis'});const id=crypto.randomUUID();await run('INSERT INTO photos(public_id,event_id,user_id,kind,filename,created_at) VALUES(?,?,?,?,?,?)',[id,event.id,req.user.id,kind,req.body.filename||`${id}.jpg`,Date.now()]);res.status(201).json({id,kind})});
app.get('/gallery/:id',async(req,res)=>{await ready;const event=await get('SELECT id,public_id,name,event_date,theme FROM events WHERE public_id=?',[req.params.id]);if(!event)return res.status(404).json({message:'Galeri tidak ditemukan'});const photos=await all('SELECT public_id id,kind,filename,created_at FROM photos WHERE event_id=? ORDER BY id DESC',[event.id]);res.json({event:{id:event.public_id,name:event.name,event_date:event.event_date,theme:event.theme},photos})});

if(require.main===module){const port=Number(process.env.PORT||8788);ready.then(()=>app.listen(port,'127.0.0.1',()=>console.log(`LoyaBooth API http://127.0.0.1:${port}`)))}
module.exports={app,ready,db};
