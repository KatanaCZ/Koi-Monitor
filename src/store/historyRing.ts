export type HistoryPoint = { timestamp: number; value: number };

export type HistoryRing = {
  buffer: Array<HistoryPoint | null>;
  head: number;
  size: number;
  seq: number;
};

export const MAX_HISTORY_POINTS = 288;

export function createHistoryRing(): HistoryRing {
  return {
    buffer: new Array<HistoryPoint | null>(MAX_HISTORY_POINTS).fill(null),
    head: 0,
    size: 0,
    seq: 0,
  };
}

/** O(1) in-place push; shallow-clone ring wrapper to trigger Zustand updates. */
export function pushHistoryRing(ring: HistoryRing, value: number): HistoryRing {
  const next: HistoryRing = {
    buffer: ring.buffer,
    head: ring.head,
    size: ring.size,
    seq: ring.seq + 1,
  };
  const point = { timestamp: Date.now(), value };

  if (next.size < MAX_HISTORY_POINTS) {
    next.buffer[next.size] = point;
    next.size += 1;
  } else {
    next.buffer[next.head] = point;
    next.head = (next.head + 1) % MAX_HISTORY_POINTS;
  }

  return next;
}

export function ringToArray(ring: HistoryRing): HistoryPoint[] {
  if (ring.size === 0) return [];
  if (ring.size < MAX_HISTORY_POINTS) {
    return ring.buffer.slice(0, ring.size) as HistoryPoint[];
  }
  const out: HistoryPoint[] = [];
  for (let i = 0; i < ring.size; i++) {
    out.push(ring.buffer[(ring.head + i) % MAX_HISTORY_POINTS]!);
  }
  return out;
}
