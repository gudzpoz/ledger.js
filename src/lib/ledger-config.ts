export const DATA_DIR = '/data';

export function asArray<T>(x?: T | T[]) {
  if (!x) {
    return [];
  }
  if (Array.isArray(x)) {
    return x;
  }
  return [x];
}
export function toUnixSecs(date: number | string) {
  if (typeof date === 'number') {
    return date;
  }
  return Math.floor(new Date(date).getTime() / 1000);
}
