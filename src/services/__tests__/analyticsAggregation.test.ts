/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Unit tests for the pure aggregation date-math: the daily cron's target date
// (CX1) and its catch-up logic (CX11).

import { describe, it, expect } from 'vitest';
import {
  getAggregationTargetDate,
  getDatesToAggregate,
} from '../analyticsAggregation';
import { shouldAggregateDateForThreshold } from '../analyticsQueryRouter';

const NOW = new Date('2026-07-05T00:00:00Z');
const THRESHOLD_DAYS = 90;
const TARGET = '2026-04-06'; // exactly THRESHOLD_DAYS before NOW (UTC)

describe('getAggregationTargetDate (CX1)', () => {
  it('is exactly threshold days before now (UTC)', () => {
    expect(getAggregationTargetDate(THRESHOLD_DAYS, NOW)).toBe(TARGET);
  });

  it('produces a target date that the aggregation predicate accepts', () => {
    // The cron target and the shouldAggregate boundary must agree — otherwise the
    // cron would target a date it then refuses to aggregate (the original CX1 bug).
    const target = getAggregationTargetDate(THRESHOLD_DAYS, NOW);
    expect(shouldAggregateDateForThreshold(target, THRESHOLD_DAYS, NOW)).toBe(true);
  });
});

describe('getDatesToAggregate (CX11 catch-up)', () => {
  it('first-ever run (no prior aggregation) does only the target date', () => {
    expect(getDatesToAggregate(null, THRESHOLD_DAYS, 30, NOW)).toEqual([TARGET]);
  });

  it('catches up every missing date after the last aggregated, up to the target', () => {
    expect(getDatesToAggregate('2026-04-03', THRESHOLD_DAYS, 30, NOW)).toEqual([
      '2026-04-04',
      '2026-04-05',
      '2026-04-06',
    ]);
  });

  it('returns nothing when already caught up to the target', () => {
    expect(getDatesToAggregate(TARGET, THRESHOLD_DAYS, 30, NOW)).toEqual([]);
  });

  it('returns nothing when the last aggregated date is past the target', () => {
    expect(getDatesToAggregate('2026-05-01', THRESHOLD_DAYS, 30, NOW)).toEqual([]);
  });

  it('caps the number of dates per run (bounded catch-up)', () => {
    const dates = getDatesToAggregate('2026-01-01', THRESHOLD_DAYS, 30, NOW);
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe('2026-01-02'); // day after last aggregated
    // The target is NOT reached in this run; the remainder is picked up later.
    expect(dates).not.toContain(TARGET);
  });
});
