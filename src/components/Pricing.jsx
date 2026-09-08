import React, { useState } from 'react';
import { Check, Infinity } from 'lucide-react';

export const plans = [
  {name:'Starter',price:'199K',suffix:'/bulan',desc:'Untuk booth kecil & pemula',features:['1 perangkat aktif','5 event per bulan','500 foto non-AI','50 generasi AI','QR & WhatsApp delivery'],cta:'Mulai Starter'},
  {name:'Pro',price:'499K',suffix:'/bulan',desc:'Untuk EO dan vendor aktif',popular:true,features:['3 perangkat aktif','Event tanpa batas','2.000 generasi AI','White-label brand','Print server & offline queue','Analytics & lead capture'],cta:'Pilih Pro'},
  {name:'Lifetime',price:'5,9JT',suffix:'sekali bayar',desc:'Lisensi permanen untuk bisnis',lifetime:true,features:['5 perangkat permanen','Event tanpa batas','Semua fitur Pro','Update utama 3 tahun','AI lokal tanpa biaya per foto','Prioritas dukungan'],cta:'Ambil Lifetime'},
];

export default function Pricing(){
  const [selected,setSelected]=useState('');
  return <section className="page pricing"><header className="center"><div><span className="eyebrow">PAKET LOYABOOTH</span><h1>Tumbuh dari event pertama</h1><p>Pilih bulanan yang fleksibel atau Lifetime untuk memiliki software selamanya.</p></div></header>
    <div className="plans">{plans.map(p=><article className={(p.popular?'popular ':'')+(p.lifetime?'lifetime':'')} key={p.name}>{p.popular&&<label>PALING LARIS</label>}{p.lifetime&&<label><Infinity/> SEKALI BAYAR</label>}<h2>{p.name}</h2><p>{p.desc}</p><div className="price"><sup>Rp</sup><b>{p.price}</b><span>{p.suffix}</span></div><button onClick={()=>setSelected(p.name)}>{p.cta}</button><ul>{p.features.map(x=><li key={x}><Check/>{x}</li>)}</ul></article>)}</div>
    {selected&&<div role="status">Paket {selected} dipilih</div>}
    <p className="footnote">Harga belum termasuk biaya AI cloud tambahan di luar kuota. Lifetime dapat memakai AI lokal agar biaya per foto nol.</p>
  </section>
}
