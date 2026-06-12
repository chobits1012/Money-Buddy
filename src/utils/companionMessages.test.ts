import { describe, expect, it } from 'vitest';
import { buildCompanionMessage } from './companionMessages';

describe('companionMessages', () => {
    it('generates placeholder invitation', () => {
        const message = buildCompanionMessage({
            displayName: '柴犬',
            mood: 'neutral',
            isStray: false,
            isPlaceholder: true,
            allocationPercent: 0,
            marketValueTWD: 0,
        });
        expect(message).toContain('柴犬');
        expect(message).toContain('軍團');
    });

    it('generates stray message', () => {
        const message = buildCompanionMessage({
            displayName: '流浪犬',
            mood: 'neutral',
            isStray: true,
            isPlaceholder: false,
            allocationPercent: 20,
            marketValueTWD: 100_000,
        });
        expect(message).toContain('還沒找到家');
    });

    it('reflects mood without investment advice', () => {
        const sad = buildCompanionMessage({
            displayName: '防禦',
            mood: 'sad',
            isStray: false,
            isPlaceholder: false,
            allocationPercent: 10,
            marketValueTWD: 50_000,
        });
        expect(sad).toContain('防禦');
        expect(sad).not.toMatch(/買入|賣出|加碼|停損/i);
    });

    it('notes dominant allocation in zone', () => {
        const message = buildCompanionMessage({
            displayName: '進攻美股',
            mood: 'happy',
            isStray: false,
            isPlaceholder: false,
            allocationPercent: 60,
            marketValueTWD: 500_000,
        });
        expect(message).toContain('主力夥伴');
    });
});
