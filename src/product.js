export const PLANS = Object.freeze({
  starter: { id:'starter', name:'Starter', price:199000, billing:'monthly', quotas:{devices:1, events:5, ai:50, photos:500} },
  pro: { id:'pro', name:'Pro', price:499000, billing:'monthly', quotas:{devices:3, events:null, ai:2000, photos:null} },
  lifetime: { id:'lifetime', name:'Lifetime', price:5900000, billing:'once', quotas:{devices:5, events:null, ai:null, photos:null} }
});

export function calculateQuota(planId, usage={}) {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Paket tidak dikenal');
  return Object.fromEntries(['events','ai','devices'].map(key => {
    const used = Math.max(0, Number(usage[key] || 0));
    const limit = plan.quotas[key];
    return [key, { used, limit, remaining:limit === null ? null : Math.max(0, limit-used), exhausted:limit !== null && used >= limit }];
  }));
}

export function createPaymentOrder(planId, tenantId, now=new Date()) {
  const plan=PLANS[planId];
  if (!plan) throw new Error('Paket tidak dikenal');
  const id=`ORD-${now.getTime()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  return {id, tenantId, planId, amount:plan.price, currency:'IDR', provider:'manual-mock', status:'pending', createdAt:now.toISOString(), paymentUrl:`#/payment/${id}`};
}

export function activateSubscription(order, now=new Date()) {
  if (!order || order.status !== 'pending') throw new Error('Order tidak dapat dibayar');
  const plan=PLANS[order.planId];
  const endsAt=plan.billing==='monthly' ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, now.getUTCDate())).toISOString() : null;
  return {id:`SUB-${order.id}`, orderId:order.id, tenantId:order.tenantId, planId:order.planId, status:'active', startsAt:now.toISOString(), endsAt};
}

export function registerDevice(devices, planId, name, codeFactory=()=>Math.random().toString(36).slice(2,8).toUpperCase()) {
  const quota=calculateQuota(planId,{devices:devices.filter(d=>d.status!=='revoked').length}).devices;
  if(quota.exhausted) throw new Error('Kuota perangkat habis');
  if(!name?.trim()) throw new Error('Nama perangkat wajib diisi');
  return {id:crypto.randomUUID(),name:name.trim(),code:codeFactory(),status:'waiting',createdAt:new Date().toISOString()};
}

export function createEvent(events, planId, input, now=new Date()) {
  if(!input?.name?.trim() || !input?.date) throw new Error('Nama dan tanggal event wajib diisi');
  const monthly=events.filter(e=>{const d=new Date(e.createdAt);return d.getUTCMonth()===now.getUTCMonth()&&d.getUTCFullYear()===now.getUTCFullYear()}).length;
  if(calculateQuota(planId,{events:monthly}).events.exhausted) throw new Error('Kuota event bulan ini habis');
  return {id:crypto.randomUUID(),name:input.name.trim(),date:input.date,status:'draft',createdAt:now.toISOString()};
}

export function createGallery(event, photos=[]) {
  const url=`https://gallery.loyabooth.id/gallery/${event.id}`;
  return {id:`GAL-${event.id}`,eventId:event.id,eventName:event.name,photos,url,qrValue:url,status:'published'};
}

export function normalizeWhatsApp(phone) {
  const digits=String(phone||'').replace(/\D/g,'');
  if(!digits) throw new Error('Nomor WhatsApp wajib diisi');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

export function buildWhatsAppLink(phone, gallery) {
  const text=`Halo! Foto dari event ${gallery.eventName} sudah siap. Buka galeri: ${gallery.url}`;
  return `https://wa.me/${normalizeWhatsApp(phone)}?text=${encodeURIComponent(text)}`;
}
