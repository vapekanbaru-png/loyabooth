import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCaptureFilename, captureVideoFrame, uploadOrQueue } from './camera.js';

afterEach(() => vi.restoreAllMocks());

describe('camera capture core', () => {
  it('membuat nama file yang aman dan stabil', () => {
    expect(buildCaptureFilename('Rani & Dimas', new Date('2026-09-07T10:11:12Z')))
      .toBe('loyabooth-rani-dimas-20260907-101112.jpg');
  });

  it('mengambil frame video dengan orientasi mirror ke JPEG', async () => {
    const calls = [];
    const context = { save:()=>calls.push('save'), translate:(...x)=>calls.push(['translate',...x]), scale:(...x)=>calls.push(['scale',...x]), drawImage:(...x)=>calls.push(['drawImage',...x]), restore:()=>calls.push('restore') };
    const blob = new Blob(['jpeg'], { type:'image/jpeg' });
    const canvas = { width:0, height:0, getContext:()=>context, toBlob:(cb,type,quality)=>{ calls.push(['toBlob',type,quality]); cb(blob); } };
    const video = { videoWidth:1920, videoHeight:1080 };
    expect(await captureVideoFrame(video, canvas, { mirror:true, quality:.9 })).toBe(blob);
    expect([canvas.width, canvas.height]).toEqual([1920,1080]);
    expect(calls).toContainEqual(['scale',-1,1]);
  });

  it('mengunggah ke API dan tidak mengantre bila sukses', async () => {
    const queue = { add:vi.fn() };
    const fetchImpl = vi.fn().mockResolvedValue({ ok:true, json:async()=>({ id:'photo-1' }) });
    const result = await uploadOrQueue({ blob:new Blob(['x']), metadata:{ eventId:'evt-1' }, endpoint:'/api/photos', queue, fetchImpl });
    expect(result).toEqual({ status:'uploaded', data:{ id:'photo-1' } });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('mengantre foto saat jaringan/API gagal', async () => {
    const queue = { add:vi.fn().mockResolvedValue('queue-1') };
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('offline'));
    const result = await uploadOrQueue({ blob:new Blob(['x']), metadata:{ eventId:'evt-1' }, endpoint:'/api/photos', queue, fetchImpl });
    expect(result).toEqual({ status:'queued', id:'queue-1' });
    expect(queue.add).toHaveBeenCalledOnce();
  });
});
