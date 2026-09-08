const request=require('supertest');
const {expect}=require('chai');
process.env.DB_FILE=':memory:';
process.env.JWT_SECRET='test-secret-strong-enough';
const {app,ready}=require('../index');

describe('LoyaBooth SaaS API',function(){
 this.timeout(10000);let token,eventId,activation,device;
 before(async()=>ready);
 it('registers and authenticates a tenant',async()=>{const r=await request(app).post('/register').send({username:'owner@loya.id',password:'Password123',business_name:'Loya Wedding',plan:'starter'}).expect(201);expect(r.body.token).a('string');token=r.body.token;await request(app).post('/login').send({username:'owner@loya.id',password:'Password123'}).expect(200)});
 it('creates a pairing code and activates one device',async()=>{const r=await request(app).post('/device/codes').set('Authorization',`Bearer ${token}`).send({name:'Kiosk Ballroom'}).expect(201);activation=r.body.code;const a=await request(app).post('/device/activate').send({code:activation}).expect(201);device=a.body;expect(device.device_id).match(/^LYB-/);await request(app).post('/device/heartbeat').send(device).expect(200)});
 it('enforces starter device limit',async()=>{await request(app).post('/device/codes').set('Authorization',`Bearer ${token}`).send({name:'Kiosk 2'}).expect(409)});
 it('creates an event and public gallery',async()=>{const r=await request(app).post('/events').set('Authorization',`Bearer ${token}`).send({name:'Pernikahan Rani & Dimas',event_date:'2026-09-07',theme:'minang'}).expect(201);eventId=r.body.id;await request(app).post(`/events/${eventId}/photos`).set('Authorization',`Bearer ${token}`).send({kind:'ai',filename:'hasil-1.jpg'}).expect(201);const g=await request(app).get(`/gallery/${eventId}`).expect(200);expect(g.body.photos).length(1)});
 it('reports real quota usage',async()=>{const r=await request(app).get('/usage').set('Authorization',`Bearer ${token}`).expect(200);expect(r.body.used).include({devices:1,events:1,ai:1,photos:1});expect(r.body.limits.deviceLimit).equal(1)});
});
