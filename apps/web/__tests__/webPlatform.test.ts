import { createWebPlatform } from '@/lib/webPlatform';

afterEach(() => localStorage.clear());

test('getWorkArea returns window dimensions', () => {
  Object.defineProperty(window, 'innerWidth',  { value: 1280, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800,  writable: true, configurable: true });
  const platform = createWebPlatform();
  const wa = platform.getWorkArea();
  platform._destroy();
  expect(wa).toEqual({ x: 0, y: 0, width: 1280, height: 800 });
});

test('savePosition and loadPosition round-trip', () => {
  const platform = createWebPlatform();
  platform.savePosition({ x: 0.5, y: 0.3 });
  expect(platform.loadPosition()).toEqual({ x: 0.5, y: 0.3 });
  platform._destroy();
});

test('loadPosition returns null when nothing saved', () => {
  const platform = createWebPlatform();
  expect(platform.loadPosition()).toBeNull();
  platform._destroy();
});

test('onMoodChange callback fires after interval', () => {
  jest.useFakeTimers();
  const platform = createWebPlatform();
  const cb = jest.fn();
  platform.onMoodChange(cb);
  jest.advanceTimersByTime(12_000);
  expect(cb).toHaveBeenCalledTimes(1);
  platform._destroy();
  jest.useRealTimers();
});

test('onMoodChange cleanup removes callback', () => {
  jest.useFakeTimers();
  const platform = createWebPlatform();
  const cb = jest.fn();
  const off = platform.onMoodChange(cb);
  off();
  jest.advanceTimersByTime(12_000);
  expect(cb).not.toHaveBeenCalled();
  platform._destroy();
  jest.useRealTimers();
});

test('onInsightReady fires after 30s', () => {
  jest.useFakeTimers();
  const platform = createWebPlatform();
  const cb = jest.fn();
  platform.onInsightReady(cb);
  jest.advanceTimersByTime(30_000);
  expect(cb).toHaveBeenCalledTimes(1);
  expect(cb.mock.calls[0][0]).toHaveProperty('text');
  platform._destroy();
  jest.useRealTimers();
});
