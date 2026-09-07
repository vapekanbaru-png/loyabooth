const flow = { welcome: 'theme', theme: 'capture', capture: 'processing', processing: 'result', result: 'welcome' };

export function createSession(eventName, theme) {
  if (!eventName?.trim()) throw new Error('Nama event wajib diisi');
  return { id: crypto.randomUUID(), eventName: eventName.trim(), theme, status: 'ready', stage: 'welcome', createdAt: new Date().toISOString() };
}
export function nextStage(stage) { return flow[stage] ?? 'welcome'; }
export function composePrompt(theme, palette, brand) {
  return `Potret event Indonesia bertema ${theme}, palet ${palette}, mempertahankan identitas wajah, komposisi natural, pencahayaan rata, elemen merek ${brand}, tanpa teks acak, resolusi cetak tinggi.`;
}
export function estimateQueueTime(ahead, secondsPerJob = 9) { return (Math.max(0, ahead) + 1) * secondsPerJob; }
