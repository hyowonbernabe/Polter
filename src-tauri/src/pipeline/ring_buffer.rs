use std::collections::VecDeque;

#[derive(Debug, Clone)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    Other,
}

/// The set of raw input events captured from the input monitor subprocess.
///
/// Intentionally excluded signals:
/// - Right-click disambiguation: `MouseButton::Right` is tracked for raw click
///   count only; right-click-specific behavior is not a behavioral signal.
/// - Zoom / scroll-to-zoom: zoom events conflate scroll and keyboard input in
///   ways that pollute both signals. They are not collected.
/// - File-save and screenshot: reserved as future low-impact context signals.
///   They must never be the sole trigger for an insight when added.
#[derive(Debug, Clone)]
pub enum RawInputEvent {
    KeyDown { ts_ms: u64, is_deletion: bool },
    KeyUp { ts_ms: u64 },
    MouseMove { x: f64, y: f64, ts_ms: u64 },
    MouseClick { button: MouseButton, ts_ms: u64 },
    Scroll { delta_x: i64, delta_y: i64, ts_ms: u64 },
}

impl RawInputEvent {
    pub fn ts_ms(&self) -> u64 {
        match self {
            RawInputEvent::KeyDown { ts_ms, .. } => *ts_ms,
            RawInputEvent::KeyUp { ts_ms } => *ts_ms,
            RawInputEvent::MouseMove { ts_ms, .. } => *ts_ms,
            RawInputEvent::MouseClick { ts_ms, .. } => *ts_ms,
            RawInputEvent::Scroll { ts_ms, .. } => *ts_ms,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct BufferCounts {
    pub keys: usize,
    pub clicks: usize,
    pub scrolls: usize,
    pub moves: usize,
}

pub struct RingBuffer {
    events: VecDeque<RawInputEvent>,
    capacity: usize,
    last_pushed_ts: Option<u64>,
}

impl RingBuffer {
    pub fn new(capacity: usize) -> Self {
        Self { events: VecDeque::with_capacity(capacity), capacity, last_pushed_ts: None }
    }

    pub fn push(&mut self, event: RawInputEvent) {
        self.last_pushed_ts = Some(event.ts_ms());
        if self.events.len() == self.capacity {
            self.events.pop_front();
        }
        self.events.push_back(event);
    }

    pub fn drain_all(&mut self) -> Vec<RawInputEvent> {
        self.events.drain(..).collect()
    }

    pub fn last_event_ts(&self) -> Option<u64> {
        self.last_pushed_ts
    }

    pub fn reset_activity(&mut self) {
        self.last_pushed_ts = None;
    }

    pub fn len(&self) -> usize {
        self.events.len()
    }

    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }

    pub fn pending_counts(&self) -> BufferCounts {
        let mut counts = BufferCounts { keys: 0, clicks: 0, scrolls: 0, moves: 0 };
        for event in &self.events {
            match event {
                RawInputEvent::KeyDown { .. } => counts.keys += 1,
                RawInputEvent::MouseClick { .. } => counts.clicks += 1,
                RawInputEvent::Scroll { .. } => counts.scrolls += 1,
                RawInputEvent::MouseMove { .. } => counts.moves += 1,
                RawInputEvent::KeyUp { .. } => {}
            }
        }
        counts
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key_down(ts: u64) -> RawInputEvent {
        RawInputEvent::KeyDown { ts_ms: ts, is_deletion: false }
    }

    #[test]
    fn push_and_drain_all() {
        let mut buf = RingBuffer::new(10);
        buf.push(key_down(100));
        buf.push(key_down(200));
        buf.push(key_down(300));
        let events = buf.drain_all();
        assert_eq!(events.len(), 3);
        assert!(buf.is_empty());
    }

    #[test]
    fn drain_returns_events_in_order() {
        let mut buf = RingBuffer::new(10);
        buf.push(key_down(100));
        buf.push(key_down(200));
        let events = buf.drain_all();
        assert_eq!(events[0].ts_ms(), 100);
        assert_eq!(events[1].ts_ms(), 200);
    }

    #[test]
    fn overflow_drops_oldest() {
        let mut buf = RingBuffer::new(3);
        buf.push(key_down(1));
        buf.push(key_down(2));
        buf.push(key_down(3));
        buf.push(key_down(4));
        assert_eq!(buf.len(), 3);
        let events = buf.drain_all();
        assert_eq!(events[0].ts_ms(), 2);
        assert_eq!(events[2].ts_ms(), 4);
    }

    #[test]
    fn last_event_ts_none_on_empty() {
        let buf = RingBuffer::new(10);
        assert!(buf.last_event_ts().is_none());
    }

    #[test]
    fn last_event_ts_returns_most_recent() {
        let mut buf = RingBuffer::new(10);
        buf.push(key_down(100));
        buf.push(key_down(500));
        assert_eq!(buf.last_event_ts(), Some(500));
    }

    #[test]
    fn last_event_ts_persists_after_drain() {
        let mut buf = RingBuffer::new(10);
        buf.push(key_down(100));
        buf.push(key_down(750));
        let _ = buf.drain_all();
        assert!(buf.is_empty());
        assert_eq!(buf.last_event_ts(), Some(750));
    }

    #[test]
    fn reset_activity_clears_last_ts() {
        let mut buf = RingBuffer::new(10);
        buf.push(key_down(300));
        buf.reset_activity();
        assert!(buf.last_event_ts().is_none());
    }

    #[test]
    fn pending_counts_tracks_by_type() {
        let mut buf = RingBuffer::new(20);
        buf.push(RawInputEvent::KeyDown { ts_ms: 1, is_deletion: false });
        buf.push(RawInputEvent::KeyDown { ts_ms: 2, is_deletion: false });
        buf.push(RawInputEvent::KeyDown { ts_ms: 3, is_deletion: true });
        buf.push(RawInputEvent::MouseClick { button: MouseButton::Left, ts_ms: 4 });
        buf.push(RawInputEvent::MouseClick { button: MouseButton::Right, ts_ms: 5 });
        buf.push(RawInputEvent::Scroll { delta_x: 0, delta_y: -3, ts_ms: 6 });
        buf.push(RawInputEvent::MouseMove { x: 10.0, y: 20.0, ts_ms: 7 });
        let counts = buf.pending_counts();
        assert_eq!(counts.keys, 3);
        assert_eq!(counts.clicks, 2);
        assert_eq!(counts.scrolls, 1);
        assert_eq!(counts.moves, 1);
        // buffer must not have been drained
        assert_eq!(buf.len(), 7);
    }
}
