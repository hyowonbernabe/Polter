use std::collections::VecDeque;

#[derive(Debug, Clone)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    Other,
}

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

pub struct RingBuffer {
    events: VecDeque<RawInputEvent>,
    capacity: usize,
}

impl RingBuffer {
    pub fn new(capacity: usize) -> Self {
        Self { events: VecDeque::with_capacity(capacity), capacity }
    }

    pub fn push(&mut self, event: RawInputEvent) {
        if self.events.len() == self.capacity {
            self.events.pop_front();
        }
        self.events.push_back(event);
    }

    pub fn drain_all(&mut self) -> Vec<RawInputEvent> {
        self.events.drain(..).collect()
    }

    pub fn last_event_ts(&self) -> Option<u64> {
        self.events.back().map(|e| e.ts_ms())
    }

    pub fn len(&self) -> usize {
        self.events.len()
    }

    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
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
}
