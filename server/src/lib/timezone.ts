const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

export function utc8MonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1) - CST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - CST_OFFSET_MS);
  return { start, end };
}

export function utc8DayRange(year: number, month: number, day: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, day) - CST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - CST_OFFSET_MS);
  return { start, end };
}

function toCSTISOString(date: Date): string {
  const cst = new Date(date.getTime() + CST_OFFSET_MS);
  const y = cst.getUTCFullYear();
  const m = String(cst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(cst.getUTCDate()).padStart(2, '0');
  const h = String(cst.getUTCHours()).padStart(2, '0');
  const min = String(cst.getUTCMinutes()).padStart(2, '0');
  const s = String(cst.getUTCSeconds()).padStart(2, '0');
  const ms = String(cst.getUTCMilliseconds()).padStart(3, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}+08:00`;
}

function transformDates(obj: any): any {
  if (obj instanceof Date) {
    return toCSTISOString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(transformDates);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = transformDates(value);
    }
    return result;
  }
  return obj;
}

export function dateTransformMiddleware(
  _req: any,
  res: any,
  next: any,
) {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    return originalJson(transformDates(body));
  };
  next();
}
