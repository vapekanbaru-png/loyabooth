import { describe, expect, it } from 'vitest';
import {
  PLANS, calculateQuota, createPaymentOrder, activateSubscription,
  registerDevice, createEvent, createGallery, buildWhatsAppLink
} from './product.js';

describe('product layer', () => {
  it('defines exact prices and quota semantics', () => {
    expect(PLANS.starter.price).toBe(199000);
    expect(PLANS.pro.price).toBe(499000);
    expect(PLANS.lifetime.price).toBe(5900000);
    expect(calculateQuota('starter', { events: 5, ai: 50, devices: 1 })).toEqual({
      events: { used: 5, limit: 5, remaining: 0, exhausted: true },
      ai: { used: 50, limit: 50, remaining: 0, exhausted: true },
      devices: { used: 1, limit: 1, remaining: 0, exhausted: true }
    });
    expect(calculateQuota('pro', { events: 99, ai: 746, devices: 2 }).events.remaining).toBe(null);
  });

  it('creates payable mock orders and activates paid subscription', () => {
    const order = createPaymentOrder('pro', 'tenant-1');
    expect(order.amount).toBe(499000);
    expect(order.status).toBe('pending');
    expect(order.paymentUrl).toContain(order.id);
    const subscription = activateSubscription(order);
    expect(subscription.status).toBe('active');
    expect(subscription.planId).toBe('pro');
  });

  it('enforces device quota and unique registration code', () => {
    const first = registerDevice([], 'starter', 'Kiosk Utama', () => 'ABC123');
    expect(first.code).toBe('ABC123');
    expect(() => registerDevice([first], 'starter', 'Kiosk Kedua')).toThrow('Kuota perangkat habis');
  });

  it('enforces monthly event quota', () => {
    const existing = Array.from({length: 5}, (_, i) => ({id:String(i), createdAt:'2026-09-01T00:00:00Z'}));
    expect(() => createEvent(existing, 'starter', {name:'Event 6', date:'2026-09-08'}, new Date('2026-09-07'))).toThrow('Kuota event bulan ini habis');
  });

  it('creates gallery and encoded WhatsApp deep link', () => {
    const gallery = createGallery({id:'evt-1', name:'Rani & Dimas'}, ['photo-1.jpg']);
    expect(gallery.qrValue).toContain('/gallery/evt-1');
    const link = buildWhatsAppLink('081234567890', gallery);
    expect(link).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(decodeURIComponent(link)).toContain('Rani & Dimas');
  });
});
