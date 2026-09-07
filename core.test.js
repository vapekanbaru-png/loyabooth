import { describe, expect, it } from 'vitest';
import { composePrompt, createSession, estimateQueueTime, nextStage } from './src/core.js';

describe('LoyaBooth core', () => {
  it('membuat sesi event berstatus siap', () => {
    expect(createSession('Pernikahan Rani & Dimas', 'nusantara')).toMatchObject({
      eventName: 'Pernikahan Rani & Dimas', theme: 'nusantara', status: 'ready', stage: 'welcome'
    });
  });

  it('menggerakkan alur kiosk secara deterministik', () => {
    expect(nextStage('welcome')).toBe('theme');
    expect(nextStage('theme')).toBe('capture');
    expect(nextStage('capture')).toBe('processing');
    expect(nextStage('processing')).toBe('result');
    expect(nextStage('result')).toBe('welcome');
  });

  it('membentuk prompt aman dan terikat brand', () => {
    expect(composePrompt('Minang', 'Merah marun', 'Loya Wedding')).toContain('Minang');
    expect(composePrompt('Minang', 'Merah marun', 'Loya Wedding')).toContain('Loya Wedding');
  });

  it('mengestimasi antrean proses', () => {
    expect(estimateQueueTime(0, 9)).toBe(9);
    expect(estimateQueueTime(3, 9)).toBe(36);
  });
});
