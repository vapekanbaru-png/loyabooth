import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Check, ChevronRight, Crown, Frame, Gauge, Image, Infinity, LayoutDashboard, MessageCircle, QrCode, Sparkles, Users, WifiOff } from 'lucide-react';
import { composePrompt, estimateQueueTime } from './core.js';
import './style.css';

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
   {view==='dashboard' && <Dashboard notify={notify}/>} 
   {view==='pricing' && <Pricing notify={notify}/>} 
  </main>{toast&&<div className="toast"><Check/> {toast}</div>}
 </div>
}

function Kiosk({theme,setTheme,prompt,notify}){return <section className="page">
 <header><div><span className="eyebrow">LOYA WEDDING · PEKANBARU</span><h1>Pilih gaya fotomu</h1><p>Pilih frame AI, lalu tersenyum. Hasil siap dibagikan lewat QR dan WhatsApp.</p></div><div className="status"><i/> Kamera & printer siap</div></header>
 <div className="theme-grid">{themes.map(t=><button key={t.id} className={'theme '+(theme.id===t.id?'selected':'')} onClick={()=>setTheme(t)} style={{'--cover':t.bg}}><div className="cover"><b>{t.emoji}</b>{theme.id===t.id&&<span><Check/></span>}</div><strong>{t.title}</strong><small>{t.meta}</small></button>)}</div>
 <div className="action-panel"><div><Sparkles/><span><b>{theme.title}</b><small>AI siap · estimasi {estimateQueueTime(0)} detik</small></span></div><button onClick={()=>notify('Kamera dimulai — bersiap!')}>Mulai foto <ChevronRight/></button></div>
 <details><summary>Prompt AI yang digunakan</summary><code>{prompt}</code></details>
 <div className="mini-features"><span><WifiOff/> Tetap memotret saat offline</span><span><QrCode/> QR instan</span><span><MessageCircle/> Kirim WhatsApp</span><span><Frame/> Cetak 2×6 & 4×6</span></div>
 </section>}

function Dashboard({notify}){return <section className="page"><header><div><span className="eyebrow">RINGKASAN EVENT</span><h1>Selamat datang, Loya Wedding</h1><p>Pantau event, perangkat, foto, dan penggunaan AI dari satu tempat.</p></div><button className="primary" onClick={()=>notify('Event baru dibuat sebagai draft')}>+ Buat event</button></header>
 <div className="stats"><Stat icon={<Image/>} n="1.284" label="Foto bulan ini"/><Stat icon={<Sparkles/>} n="746" label="Generasi AI"/><Stat icon={<Users/>} n="392" label="Tamu unik"/><Stat icon={<Gauge/>} n="98,7%" label="Sukses diproses"/></div>
 <div className="dashboard-grid"><div className="panel"><div className="panel-head"><h2>Event aktif</h2><button onClick={()=>notify('Data diperbarui')}>Perbarui</button></div><table><thead><tr><th>EVENT</th><th>PERANGKAT</th><th>FOTO</th><th>STATUS</th></tr></thead><tbody><tr><td><b>Pernikahan Rani & Dimas</b><small>7 Sep 2026 · Pekanbaru</small></td><td>Kiosk-01</td><td>436</td><td><span className="pill live">Berjalan</span></td></tr><tr><td><b>Graduation SMAN 8</b><small>5 Sep 2026 · Kampar</small></td><td>Kiosk-02</td><td>848</td><td><span className="pill">Selesai</span></td></tr></tbody></table></div>
 <div className="panel usage"><h2>Paket Pro</h2><p>746 dari 2.000 generasi AI</p><div className="bar"><i/></div><strong>37%</strong><small>Reset 24 hari lagi</small><button onClick={()=>notify('Halaman upgrade dibuka')}>Kelola paket</button></div></div>
 </section>}
function Stat({icon,n,label}){return <div className="stat"><span>{icon}</span><div><strong>{n}</strong><small>{label}</small></div></div>}

function Pricing({notify}){return <section className="page pricing"><header className="center"><div><span className="eyebrow">PAKET LOYABOOTH</span><h1>Tumbuh dari event pertama</h1><p>Pilih bulanan yang fleksibel atau Lifetime untuk memiliki software selamanya.</p></div></header><div className="plans">{plans.map(p=><article className={(p.popular?'popular ':'')+(p.lifetime?'lifetime':'')} key={p.name}>{p.popular&&<label>PALING LARIS</label>}{p.lifetime&&<label><Infinity/> SEKALI BAYAR</label>}<h2>{p.name}</h2><p>{p.desc}</p><div className="price"><sup>Rp</sup><b>{p.price}</b><span>{p.suffix}</span></div><button onClick={()=>notify(`Paket ${p.name} dipilih`)}>{p.cta}</button><ul>{p.features.map(x=><li key={x}><Check/>{x}</li>)}</ul></article>)}</div><p className="footnote">Harga belum termasuk biaya AI cloud tambahan di luar kuota. Lifetime dapat memakai AI lokal agar biaya per foto nol.</p></section>}

createRoot(document.getElementById('root')).render(<App/>);
