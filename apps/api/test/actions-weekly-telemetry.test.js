import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeeklyTelemetry,
  getBangkokWeekStart,
} from '../src/controllers/actions.controller.js';

describe('Weekly action telemetry', () => {
  it('starts the school week on Monday at midnight in Bangkok time', () => {
    const now = new Date('2026-10-30T16:00:00.000Z');

    assert.equal(getBangkokWeekStart(now).toISOString(), '2026-10-25T17:00:00.000Z');
  });

  it('groups approved action data into seven Bangkok calendar days', () => {
    const now = new Date('2026-10-30T16:00:00.000Z');
    const telemetry = buildWeeklyTelemetry(
      [
        { createdAt: '2026-10-25T18:00:00.000Z', pointsAwarded: 10, co2SavedKg: 0.045 },
        { createdAt: '2026-10-26T00:00:00.000Z', pointsAwarded: 15, co2SavedKg: 0.17 },
        { createdAt: '2026-10-31T00:00:00.000Z', pointsAwarded: 20, co2SavedKg: 0.5 },
        { createdAt: '2026-10-25T16:59:59.000Z', pointsAwarded: 100, co2SavedKg: 10 },
      ],
      now
    );

    assert.equal(telemetry.weekStart, '2026-10-26');
    assert.equal(telemetry.currentDayIndex, 4);
    assert.equal(telemetry.days.length, 7);
    assert.equal(telemetry.days[0].actions, 2);
    assert.equal(telemetry.days[0].pointsEarned, 25);
    assert.equal(telemetry.days[0].co2SavedKg, 0.22);
    assert.equal(telemetry.days[5].actions, 1);
    assert.equal(telemetry.totalActions, 3);
    assert.equal(telemetry.totalPointsEarned, 45);
    assert.equal(telemetry.totalCo2SavedKg, 0.72);
  });
});
