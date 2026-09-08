const DB_NAME = 'loyabooth-camera';
const STORE_NAME = 'pending-captures';

export function buildCaptureFilename(eventName = 'event', date = new Date()) {
  const slug = eventName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
  const stamp = date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `loyabooth-${slug}-${stamp}.jpg`;
}

export function captureVideoFrame(video, canvas, { mirror = true, quality = .92 } = {}) {
  if (!video?.videoWidth || !video?.videoHeight) return Promise.reject(new Error('Pratinjau kamera belum siap'));
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.save();
  if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gagal membuat foto')), 'image/jpeg', quality));
}

export function createCaptureQueue(indexedDBImpl = globalThis.indexedDB) {
  function db() {
    return new Promise((resolve, reject) => {
      const req = indexedDBImpl.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath:'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function transact(mode, action) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, mode);
      const request = action(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => database.close();
    });
  }
  return {
    async add(payload) { const id = crypto.randomUUID(); await transact('readwrite', s => s.put({ ...payload, id, queuedAt:new Date().toISOString() })); return id; },
    all: () => transact('readonly', s => s.getAll()),
    remove: id => transact('readwrite', s => s.delete(id)),
  };
}

async function upload({ blob, metadata, endpoint, fetchImpl }) {
  const body = new FormData();
  body.append('photo', blob, metadata.filename || buildCaptureFilename(metadata.eventName));
  body.append('metadata', JSON.stringify(metadata));
  const response = await fetchImpl(endpoint, { method:'POST', body, headers:{ 'Accept':'application/json' } });
  if (!response.ok) throw new Error(`Unggah gagal (${response.status})`);
  return response.status === 204 ? {} : response.json();
}

export async function uploadOrQueue({ blob, metadata, endpoint, queue, fetchImpl = fetch }) {
  try { return { status:'uploaded', data:await upload({ blob, metadata, endpoint, fetchImpl }) }; }
  catch { return { status:'queued', id:await queue.add({ blob, metadata, endpoint }) }; }
}

export async function flushCaptureQueue(queue, fetchImpl = fetch) {
  const jobs = await queue.all(); let uploaded = 0;
  for (const job of jobs) {
    try { await upload({ ...job, fetchImpl }); await queue.remove(job.id); uploaded += 1; }
    catch { /* keep for next online attempt */ }
  }
  return { uploaded, remaining:jobs.length - uploaded };
}

export function cameraErrorMessage(error) {
  const messages = { NotAllowedError:'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser.', NotFoundError:'Kamera tidak ditemukan.', NotReadableError:'Kamera sedang digunakan aplikasi lain.', OverconstrainedError:'Kamera tidak mendukung konfigurasi yang dipilih.', SecurityError:'Kamera memerlukan HTTPS atau localhost.' };
  return messages[error?.name] || error?.message || 'Kamera gagal dimulai.';
}
