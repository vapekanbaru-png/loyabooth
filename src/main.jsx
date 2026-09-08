import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Check, ChevronRight, Crown, Download, Frame, Gauge, Image, Infinity, LayoutDashboard, MessageCircle, QrCode, RefreshCw, Sparkles, SwitchCamera, Users, Wifi, WifiOff, X } from 'lucide-react';
import { composePrompt, estimateQueueTime } from './core.js';
import ProductDashboard from './components/ProductDashboard.jsx';
import Pricing from './components/Pricing.jsx';
import { buildCaptureFilename, cameraErrorMessage, captureVideoFrame, createCaptureQueue, flushCaptureQueue, uploadOrQueue } from './camera.js';
import './style.css';
import './product.css';

const themes = [
  { id:'minang', title:'Minang Modern', meta:'Marun · Emas', bg:'linear-gradient(145deg,#6f1025,#d89b3c)', emoji:'🏯' },
  { id:'jawa', title:'Jawa Klasik', meta:'Cokelat · Batik', bg:'linear-gradient(145deg,#5a3921,#c68c53)', emoji:'🌿' },
  { id:'nusantara', title:'Nusantara Pop', meta:'Ceria · Modern', bg:'linear-gradient(145deg,#0a7c86,#ff8b5c)', emoji:'✨' },
  { id:'corporate', title:'Corporate Clean', meta:'Biru · Putih', bg:'linear-gradient(145deg,#174ea6,#7bc6ff)', emoji:'🏢' },
];
const plans = [
  {name:'Starter',price:'199K',suffix:'/bulan',desc:'Untuk booth kecil & pemula',features:['1 perangkat aktif','5 event per bulan','500 foto non-AI','50 generasi AI','QR & WhatsApp delivery'],cta:'Mulai Starter'},
  {name:'Pro',price:'499K',suffix:'/bulan',desc:'Untuk EO dan vendor aktif',popular:true,features:['3 perangkat aktif','Event tanpa batas','2.000 generasi AI','White-label brand','Print server & offline queue','Analytics & lead capture'],cta:'Pilih Pro'},
  {name:'Lifetime',price:'5,9JT',suffix:'sekali bayar',desc:'Lisensi permanen untuk bisnis',lifetime:true,features:['5 perangkat permanen','Event tanpa batas','Semua fitur Pro','Update utama 3 tahun','AI lokal tanpa biaya per foto','Prioritas dukungan'],cta:'Ambil Lifetime'},
];

function App(){
 const [view,setView]=useState('kiosk'); const [theme,setTheme]=useState(themes[0]); const [toast,setToast]=useState('');
 const prompt=useMemo(()=>composePrompt(theme.title,theme.meta,'LoyaBooth Indonesia'),[theme]);
 function notify(text){setToast(text);setTimeout(()=>setToast(''),2200)}
 return <div className="app">
  <aside><div className="logo"><span>LB</span><b>LoyaBooth</b></div><nav>
   <button className={view==='kiosk'?'active':''} onClick={()=>setView('kiosk')}><Camera/>Kiosk Booth</button>
   <button className={view==='dashboard'?'active':''} onClick={()=>setView('dashboard')}><LayoutDashboard/>Dashboard</button>
   <button className={view==='pricing'?'active':''} onClick={()=>setView('pricing')}><Crown/>Paket SaaS</button>
  </nav><div className="tenant"><small>WORKSPACE</small><strong>Loya Wedding</strong><span><i/> Perangkat siap</span></div></aside>
  <main>
   {view==='kiosk' && <Kiosk theme={theme} setTheme={setTheme} prompt={prompt} notify={notify}/>} 
   {view==='dashboard' && <ProductDashboard notify={notify}/>}
   {view==='pricing' && <Pricing notify={notify}/>} 
  </main>{toast&&<div className="toast"><Check/> {toast}</div>}
 </div>
}

function Kiosk({theme,setTheme,prompt,notify}){
 const [showCamera,setShowCamera]=useState(false);
 return <section className="page">
 <header><div><span className="eyebrow">LOYA WEDDING · PEKANBARU</span><h1>Pilih gaya fotomu</h1><p>Pilih frame AI, lalu tersenyum. Hasil siap dibagikan lewat QR dan WhatsApp.</p></div><div className="status"><i/> Kamera & printer siap</div></header>
 <div className="theme-grid">{themes.map(t=><button key={t.id} className={'theme '+(theme.id===t.id?'selected':'')} onClick={()=>setTheme(t)} style={{'--cover':t.bg}}><div className="cover"><b>{t.emoji}</b>{theme.id===t.id&&<span><Check/></span>}</div><strong>{t.title}</strong><small>{t.meta}</small></button>)}</div>
 <div className="action-panel"><div><Sparkles/><span><b>{theme.title}</b><small>AI siap · estimasi {estimateQueueTime(0)} detik</small></span></div><button onClick={()=>setShowCamera(true)}>Mulai foto <ChevronRight/></button></div>
 <details><summary>Prompt AI yang digunakan</summary><code>{prompt}</code></details>
 <div className="mini-features"><span><WifiOff/> Tetap memotret saat offline</span><span><QrCode/> QR instan</span><span><MessageCircle/> Kirim WhatsApp</span><span><Frame/> Cetak 2×6 & 4×6</span></div>
 {showCamera&&<CameraBooth theme={theme} prompt={prompt} onClose={()=>setShowCamera(false)} notify={notify}/>}
 </section>}

const CAPTURE_API = import.meta.env.VITE_CAPTURE_API_URL || '/api/v1/photos';
function CameraBooth({theme,prompt,onClose,notify}) {
 const videoRef=useRef(null), canvasRef=useRef(null), streamRef=useRef(null), urlRef=useRef(null);
 const queue=useMemo(()=>createCaptureQueue(),[]);
 const [devices,setDevices]=useState([]), [deviceId,setDeviceId]=useState(''), [phase,setPhase]=useState('permission');
 const [error,setError]=useState(''), [countdown,setCountdown]=useState(null), [blob,setBlob]=useState(null), [photoUrl,setPhotoUrl]=useState('');
 const [online,setOnline]=useState(navigator.onLine), [pending,setPending]=useState(0), [saving,setSaving]=useState(false);
 const stop=()=>{streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null};
 const updateQueue=async()=>{try{setPending((await queue.all()).length)}catch{setPending(0)}};
 async function startCamera(selected=deviceId) {
  setError(''); stop();
  try {
   const constraints={audio:false,video:selected?{deviceId:{exact:selected},width:{ideal:1920},height:{ideal:1080}}:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}}};
   const stream=await navigator.mediaDevices.getUserMedia(constraints); streamRef.current=stream;
   if(videoRef.current){videoRef.current.srcObject=stream; await videoRef.current.play()}
   const cams=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'); setDevices(cams);
   const active=stream.getVideoTracks()[0]?.getSettings().deviceId; if(active)setDeviceId(active);
   setPhase('preview');
  } catch(e){setError(cameraErrorMessage(e));setPhase('permission')}
 }
 useEffect(()=>{updateQueue();const onOnline=async()=>{setOnline(true);const r=await flushCaptureQueue(queue);await updateQueue();if(r.uploaded)notify(`${r.uploaded} foto offline berhasil dikirim`)};const onOffline=()=>setOnline(false);window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);return()=>{stop();if(urlRef.current)URL.revokeObjectURL(urlRef.current);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline)}},[]);
 useEffect(()=>{if(phase==='preview'&&deviceId)startCamera(deviceId)},[deviceId]);
 function beginCountdown(){if(countdown!==null)return;let value=3;setCountdown(value);const timer=setInterval(async()=>{value-=1;if(value>0){setCountdown(value);return}clearInterval(timer);setCountdown(null);try{const captured=await captureVideoFrame(videoRef.current,canvasRef.current,{mirror:true});setBlob(captured);if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current=URL.createObjectURL(captured);setPhotoUrl(urlRef.current);setPhase('result')}catch(e){setError(e.message)}},1000)}
 async function save(){if(!blob)return;setSaving(true);const metadata={eventId:'rani-dimas-2026',eventName:'Pernikahan Rani & Dimas',theme:theme.id,prompt,capturedAt:new Date().toISOString(),filename:buildCaptureFilename('Rani Dimas')};const result=await uploadOrQueue({blob,metadata,endpoint:CAPTURE_API,queue});await updateQueue();setSaving(false);notify(result.status==='uploaded'?'Foto tersimpan dan terkirim':'Offline — foto aman dalam antrean');}
 function download(){const a=document.createElement('a');a.href=photoUrl;a.download=buildCaptureFilename('Rani Dimas');a.click()}
 function retake(){setBlob(null);setPhotoUrl('');setPhase('preview')}
 return <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Kamera LoyaBooth"><div className="camera-shell">
  <div className="camera-top"><div><b>LoyaBooth Camera</b><span className={online?'online':'offline'}>{online?<Wifi/>:<WifiOff/>}{online?'Online':'Offline'}{pending>0&&` · ${pending} antre`}</span></div><button aria-label="Tutup kamera" onClick={()=>{stop();onClose()}}><X/></button></div>
  <div className="camera-stage">
   {phase==='permission'&&<div className="permission-card"><Camera/><h2>Aktifkan kamera</h2><p>Izinkan akses kamera untuk melihat pratinjau dan mengambil foto.</p><button className="capture-primary" onClick={()=>startCamera()}>Izinkan & mulai kamera</button>{error&&<div className="camera-error" role="alert">{error}</div>}</div>}
   <video ref={videoRef} className={phase==='preview'?'live-preview':'hidden'} muted playsInline aria-label="Pratinjau kamera"/>
   <canvas ref={canvasRef} hidden/>
   {phase==='result'&&<img className="photo-result" src={photoUrl} alt="Hasil foto"/>}
   {countdown!==null&&<div className="countdown" aria-live="assertive">{countdown}</div>}
  </div>
  {phase==='preview'&&<div className="camera-controls"><label><SwitchCamera/> Kamera<select value={deviceId} onChange={e=>setDeviceId(e.target.value)}>{devices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Kamera ${i+1}`}</option>)}</select></label><button className="shutter" aria-label="Ambil foto" disabled={countdown!==null} onClick={beginCountdown}><span/></button><button className="small-control" onClick={()=>startCamera(deviceId)}><RefreshCw/> Muat ulang</button></div>}
  {phase==='result'&&<div className="result-controls"><button onClick={retake}><RefreshCw/> Foto ulang</button><button onClick={download}><Download/> Unduh</button><button className="capture-primary" onClick={save} disabled={saving}><Check/> {saving?'Menyimpan…':'Simpan foto'}</button></div>}
 </div></div>
}

function Dashboard({notify}){return <section className="page"><header><div><span className="eyebrow">RINGKASAN EVENT</span><h1>Selamat datang, Loya Wedding</h1><p>Pantau event, perangkat, foto, dan penggunaan AI dari satu tempat.</p></div><button className="primary" onClick={()=>notify('Event baru dibuat sebagai draft')}>+ Buat event</button></header>
 <div className="stats"><Stat icon={<Image/>} n="1.284" label="Foto bulan ini"/><Stat icon={<Sparkles/>} n="746" label="Generasi AI"/><Stat icon={<Users/>} n="392" label="Tamu unik"/><Stat icon={<Gauge/>} n="98,7%" label="Sukses diproses"/></div>
 <div className="dashboard-grid"><div className="panel"><div className="panel-head"><h2>Event aktif</h2><button onClick={()=>notify('Data diperbarui')}>Perbarui</button></div><table><thead><tr><th>EVENT</th><th>PERANGKAT</th><th>FOTO</th><th>STATUS</th></tr></thead><tbody><tr><td><b>Pernikahan Rani & Dimas</b><small>7 Sep 2026 · Pekanbaru</small></td><td>Kiosk-01</td><td>436</td><td><span className="pill live">Berjalan</span></td></tr><tr><td><b>Graduation SMAN 8</b><small>5 Sep 2026 · Kampar</small></td><td>Kiosk-02</td><td>848</td><td><span className="pill">Selesai</span></td></tr></tbody></table></div>
 <div className="panel usage"><h2>Paket Pro</h2><p>746 dari 2.000 generasi AI</p><div className="bar"><i/></div><strong>37%</strong><small>Reset 24 hari lagi</small><button onClick={()=>notify('Halaman upgrade dibuka')}>Kelola paket</button></div></div>
 </section>}
function Stat({icon,n,label}){return <div className="stat"><span>{icon}</span><div><strong>{n}</strong><small>{label}</small></div></div>}

function LegacyPricing({notify}){return <section className="page pricing"><header className="center"><div><span className="eyebrow">PAKET LOYABOOTH</span><h1>Tumbuh dari event pertama</h1><p>Pilih bulanan yang fleksibel atau Lifetime untuk memiliki software selamanya.</p></div></header><div className="plans">{plans.map(p=><article className={(p.popular?'popular ':'')+(p.lifetime?'lifetime':'')} key={p.name}>{p.popular&&<label>PALING LARIS</label>}{p.lifetime&&<label><Infinity/> SEKALI BAYAR</label>}<h2>{p.name}</h2><p>{p.desc}</p><div className="price"><sup>Rp</sup><b>{p.price}</b><span>{p.suffix}</span></div><button onClick={()=>notify(`Paket ${p.name} dipilih`)}>{p.cta}</button><ul>{p.features.map(x=><li key={x}><Check/>{x}</li>)}</ul></article>)}</div><p className="footnote">Harga belum termasuk biaya AI cloud tambahan di luar kuota. Lifetime dapat memakai AI lokal agar biaya per foto nol.</p></section>}

createRoot(document.getElementById('root')).render(<App/>);
