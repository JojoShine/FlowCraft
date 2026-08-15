export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const datePart = dateStr.slice(0, 10);
  if (!datePart || datePart.length < 10) return '';
  const [y, m, d] = datePart.split('-');
  return `${y}/${m}/${d}`;
}

export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const datePart = dateStr.slice(0, 10);
  if (!datePart || datePart.length < 10) return '';
  const [y, m, d] = datePart.split('-');
  const weekday = new Date(`${datePart}T12:00:00`).getDay();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${y}/${m}/${d} ${weekdays[weekday]}`;
}

export function getDayInTZ(dateStr: string): number {
  return parseInt(dateStr.slice(8, 10), 10);
}

export function getMonthInTZ(dateStr: string): number {
  return parseInt(dateStr.slice(5, 7), 10);
}

export function getYearInTZ(dateStr: string): number {
  return parseInt(dateStr.slice(0, 4), 10);
}
