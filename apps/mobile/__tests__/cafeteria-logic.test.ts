/**
 * Unit tests for cafeteria.tsx logic
 *
 * These tests validate the date calculation and API response handling
 * without requiring React Native rendering.
 */

// Helper functions extracted from cafeteria.tsx logic

/**
 * Gets the start of week (Monday) for a given offset from current week
 */
function getStartOfWeek(weekOffset: number): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Gets the date for a specific day of the week (1=Mon, 5=Fri)
 */
function getDayDate(startOfWeek: Date, day: number): Date {
  const date = new Date(startOfWeek);
  date.setDate(startOfWeek.getDate() + day - 1);
  return date;
}

/**
 * Formats a date as YYYY-MM-DD
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayNum = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
}

/**
 * Safely extracts items from an API response
 */
function safeGetItems<T>(data: unknown): T[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.items)) {
    return obj.items as T[];
  }
  return [];
}

describe('Cafeteria Logic - Date Calculations', () => {
  test('getStartOfWeek returns Monday for weekOffset=0', () => {
    const monday = getStartOfWeek(0);
    expect(monday.getDay()).toBe(1); // 1 = Monday
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
  });

  test('getStartOfWeek with offset=1 returns next week Monday', () => {
    const thisMonday = getStartOfWeek(0);
    const nextMonday = getStartOfWeek(1);

    const dayDiff = Math.round((nextMonday.getTime() - thisMonday.getTime()) / (24 * 60 * 60 * 1000));
    expect(dayDiff).toBe(7);
  });

  test('getStartOfWeek with offset=-1 returns previous week Monday', () => {
    const thisMonday = getStartOfWeek(0);
    const prevMonday = getStartOfWeek(-1);

    const dayDiff = Math.round((thisMonday.getTime() - prevMonday.getTime()) / (24 * 60 * 60 * 1000));
    expect(dayDiff).toBe(7);
  });

  test('getDayDate returns correct dates for each weekday', () => {
    const monday = getStartOfWeek(0);

    // Monday (day=1) should be the start of week
    const mondayResult = getDayDate(monday, 1);
    expect(mondayResult.getDay()).toBe(1);

    // Friday (day=5) should be 4 days after Monday
    const fridayResult = getDayDate(monday, 5);
    expect(fridayResult.getDay()).toBe(5);

    // Verify the dates are consecutive
    const daysBetween = Math.round((fridayResult.getTime() - mondayResult.getTime()) / (24 * 60 * 60 * 1000));
    expect(daysBetween).toBe(4);
  });

  test('formatDateString returns YYYY-MM-DD format', () => {
    const testDate = new Date(2025, 0, 15); // January 15, 2025
    expect(formatDateString(testDate)).toBe('2025-01-15');

    const testDate2 = new Date(2025, 11, 5); // December 5, 2025
    expect(formatDateString(testDate2)).toBe('2025-12-05');
  });
});

describe('Cafeteria Logic - Safe API Response Handling', () => {
  test('safeGetItems handles null data', () => {
    expect(safeGetItems(null)).toEqual([]);
  });

  test('safeGetItems handles undefined data', () => {
    expect(safeGetItems(undefined)).toEqual([]);
  });

  test('safeGetItems handles missing items property', () => {
    expect(safeGetItems({})).toEqual([]);
  });

  test('safeGetItems handles non-array items property', () => {
    expect(safeGetItems({ items: 'not an array' })).toEqual([]);
  });

  test('safeGetItems returns items array when present', () => {
    const items = [{ id: '1', name: 'Item 1' }];
    expect(safeGetItems({ items })).toEqual(items);
  });

  test('safeGetItems handles empty items array', () => {
    expect(safeGetItems({ items: [] })).toEqual([]);
  });

  test('safeGetItems handles items with complex objects', () => {
    const items = [
      { id: '1', name: 'Item 1', price: 1000, nested: { value: 'test' } },
      { id: '2', name: 'Item 2', price: 2000 },
    ];
    expect(safeGetItems({ items })).toEqual(items);
  });
});

describe('Week Offset Menu Reload Logic', () => {
  test('changing weekOffset produces different Monday dates', () => {
    const week0Monday = getStartOfWeek(0);
    const week1Monday = getStartOfWeek(1);
    const weekNeg1Monday = getStartOfWeek(-1);

    // All should be different dates
    expect(week0Monday.getTime()).not.toBe(week1Monday.getTime());
    expect(week0Monday.getTime()).not.toBe(weekNeg1Monday.getTime());
    expect(week1Monday.getTime()).not.toBe(weekNeg1Monday.getTime());
  });

  test('same day selection in different weeks produces different dates', () => {
    const week0Monday = getStartOfWeek(0);
    const week1Monday = getStartOfWeek(1);

    const day = 3; // Wednesday
    const week0Wednesday = getDayDate(week0Monday, day);
    const week1Wednesday = getDayDate(week1Monday, day);

    const dateStr0 = formatDateString(week0Wednesday);
    const dateStr1 = formatDateString(week1Wednesday);

    expect(dateStr0).not.toBe(dateStr1);

    // Should be exactly 7 days apart
    const dayDiff = Math.round((week1Wednesday.getTime() - week0Wednesday.getTime()) / (24 * 60 * 60 * 1000));
    expect(dayDiff).toBe(7);
  });
});
