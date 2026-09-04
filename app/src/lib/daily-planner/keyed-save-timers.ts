export type KeyedSaveTimerMap = Map<string, ReturnType<typeof setTimeout>>;

export function clearKeyedSaveTimer(
  timers: KeyedSaveTimerMap,
  key: string,
): void {
  const timer = timers.get(key);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(key);
}

/** Replaces only this key's pending callback; timers for other plan dates survive. */
export function replaceKeyedSaveTimer(
  timers: KeyedSaveTimerMap,
  key: string,
  callback: () => void,
  delayMs: number,
): void {
  clearKeyedSaveTimer(timers, key);
  const timer = setTimeout(() => {
    if (timers.get(key) === timer) timers.delete(key);
    callback();
  }, delayMs);
  timers.set(key, timer);
}
