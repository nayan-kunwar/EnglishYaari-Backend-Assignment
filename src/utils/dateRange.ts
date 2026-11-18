export interface UtcDayRange {
  start: Date;
  end: Date;
}

/**
 * Returns the [start, end) range for the UTC calendar day containing `date`.
 * UTC is used explicitly so results do not depend on the server's timezone.
 */
export const getUtcDayRange = (date: Date): UtcDayRange => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};
