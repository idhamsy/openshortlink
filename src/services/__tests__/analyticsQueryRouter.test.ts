/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Unit tests for the pure analytics date-math + merge functions.
// These cover the confirmed audit bugs CX1 (aggregation boundary off-by-one),
// CX3 (AE<->D1 split inverted) and CX4 (threshold day double-counted).

import { describe, it, expect } from 'vitest';
import {
  splitDateRange,
  shouldAggregateDateForThreshold,
  mergeTimeSeries,
} from '../analyticsQueryRouter';

// Fixed "now" so the threshold math is deterministic regardless of test TZ/clock.
// 2026-07-05 minus 90 days === 2026-04-06 (the threshold boundary).
const NOW = new Date('2026-07-05T00:00:00Z');
const THRESHOLD_DAYS = 90;
const THRESHOLD = '2026-04-06'; // exactly THRESHOLD_DAYS before NOW (UTC)

describe('splitDateRange', () => {
  it('CX3: a spanning range assigns the NEWER segment to `recent` (Analytics Engine) and the OLDER to `old` (D1)', () => {
    const split = splitDateRange('2026-01-01', '2026-07-05', THRESHOLD_DAYS, NOW);

    // recent = newer segment queried from Analytics Engine
    expect(split.recent).not.toBeNull();
    expect(split.recent!.start).toBe(THRESHOLD);
    expect(split.recent!.end).toBe('2026-07-05');

    // old = older segment queried from D1
    expect(split.old).not.toBeNull();
    expect(split.old!.start).toBe('2026-01-01');
  });

  it('CX4: the threshold boundary day is not shared — `old` ends the day before `recent` starts', () => {
    const split = splitDateRange('2026-01-01', '2026-07-05', THRESHOLD_DAYS, NOW);

    expect(split.old!.end).toBe('2026-04-05'); // one day before the threshold
    expect(split.recent!.start).toBe('2026-04-06');

    // Ranges are strictly disjoint: recent.start === old.end + 1 day, no overlap.
    const oldEndMs = new Date(split.old!.end + 'T00:00:00Z').getTime();
    const recentStartMs = new Date(split.recent!.start + 'T00:00:00Z').getTime();
    expect(recentStartMs - oldEndMs).toBe(86400 * 1000);
  });

  it('returns only `old` when the whole range is before the threshold', () => {
    const split = splitDateRange('2026-01-01', '2026-03-01', THRESHOLD_DAYS, NOW);
    expect(split.recent).toBeNull();
    expect(split.old).toEqual({ start: '2026-01-01', end: '2026-03-01' });
  });

  it('returns only `recent` when the whole range is at/after the threshold', () => {
    const split = splitDateRange('2026-05-01', '2026-07-05', THRESHOLD_DAYS, NOW);
    expect(split.old).toBeNull();
    expect(split.recent).toEqual({ start: '2026-05-01', end: '2026-07-05' });
  });
});

describe('shouldAggregateDateForThreshold (CX1)', () => {
  it('ACCEPTS the cron\'s own target date (exactly threshold days old)', () => {
    // This is the regression: strict `<` made this false forever, so the cron
    // aggregated nothing. It must now be true.
    expect(shouldAggregateDateForThreshold(THRESHOLD, THRESHOLD_DAYS, NOW)).toBe(true);
  });

  it('accepts dates older than the threshold', () => {
    expect(shouldAggregateDateForThreshold('2026-04-05', THRESHOLD_DAYS, NOW)).toBe(true);
    expect(shouldAggregateDateForThreshold('2026-01-01', THRESHOLD_DAYS, NOW)).toBe(true);
  });

  it('rejects dates newer than the threshold (still within AE retention)', () => {
    expect(shouldAggregateDateForThreshold('2026-04-07', THRESHOLD_DAYS, NOW)).toBe(false);
    expect(shouldAggregateDateForThreshold('2026-07-05', THRESHOLD_DAYS, NOW)).toBe(false);
  });
});

describe('mergeTimeSeries', () => {
  it('CX4: disjoint recent/old segments merge without double-counting any date', () => {
    const recent = [
      { date: '2026-04-06', clicks: 5, unique_visitors: 3 },
      { date: '2026-04-07', clicks: 8, unique_visitors: 4 },
    ];
    const old = [
      { date: '2026-04-04', clicks: 2, unique_visitors: 1 },
      { date: '2026-04-05', clicks: 3, unique_visitors: 2 },
    ];

    const merged = mergeTimeSeries(recent, old);

    expect(merged.map(p => p.date)).toEqual([
      '2026-04-04',
      '2026-04-05',
      '2026-04-06',
      '2026-04-07',
    ]);
    // No date is inflated; total is the plain sum of both disjoint series.
    expect(merged.reduce((s, p) => s + p.clicks, 0)).toBe(18);
    expect(merged.find(p => p.date === '2026-04-06')!.clicks).toBe(5);
  });

  it('keeps a single entry per date and sorts ascending', () => {
    const merged = mergeTimeSeries(
      [{ date: '2026-04-06', clicks: 5, unique_visitors: 3 }],
      [{ date: '2026-04-05', clicks: 2, unique_visitors: 1 }]
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].date).toBe('2026-04-05');
  });
});
