import { describe, expect, it } from 'vitest';
import { UNASSIGNED } from '../event-styles';
import type { HallBoardRow } from '../types';
import { groupRows } from '../../_components/WeekBoard';

const row = (hallName: string, banquetName?: string, rowType?: 'hall' | 'googleVenue'): HallBoardRow => ({
  hallName,
  banquetName,
  rowType,
  slots: [],
});

describe('groupRows', () => {
  it('groups rows by banquet and places unassigned / google last', () => {
    const groups = groupRows([
      row('Mystery Hall'),
      row('Crystal Hall', 'BIKA 2'),
      row('Emerald Hall', 'BIKA 1'),
      row('Google Venue', 'Google Calendar Venue', 'googleVenue'),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      'BIKA 1',
      'BIKA 2',
      UNASSIGNED,
      'Google Calendar',
    ]);
    expect(groups[0].rows.map((entry) => entry.hallName)).toEqual(['Emerald Hall']);
    expect(groups[2].rows.map((entry) => entry.hallName)).toEqual(['Mystery Hall']);
    expect(groups[3].google).toBe(true);
  });
});
