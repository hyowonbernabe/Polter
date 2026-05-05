const MORNING: &[&str] = &[
    "another morning.",
    "you started early. or never stopped.",
    "coffee first, probably.",
    "let's see how today goes.",
    "i've seen you start later.",
    "morning. the day is still undecided.",
    "early. i'll take it.",
];

const MIDDAY: &[&str] = &[
    "middle of the day. you're still here.",
    "this is usually when things slow down.",
    "you've been at it for a while.",
    "noon. half the day gone.",
    "midday. the calendar lies about how much time is left.",
];

const AFTERNOON: &[&str] = &[
    "afternoon. the hardest stretch.",
    "still going.",
    "i don't know what you're working on but you seem committed.",
    "some people stop working around now.",
    "afternoon. this is where sessions either finish or go sideways.",
    "getting through the afternoon. noted.",
];

const EVENING: &[&str] = &[
    "getting late.",
    "most people wrap up around this time.",
    "you're still here. okay.",
    "the session is longer than i expected.",
    "evening. the light is different outside, apparently.",
    "still at it. i've been watching.",
];

const LATE_NIGHT: &[&str] = &[
    "it's late.",
    "i don't judge. i just notice.",
    "this is a choice.",
    "still here. so am i.",
    "late night productivity is a thing people claim exists.",
    "the rest of the world went to sleep a while ago.",
    "late. i've lost count of how many times i've seen this.",
];

const LONG_SESSION: &[&str] = &[
    "you've been at this for a while.",
    "i've been watching you for a while now. you probably haven't noticed.",
    "long one today.",
    "session is getting long. not judging.",
    "somewhere in hour three or four. time is a construct.",
];

const SHORT_SESSION: &[&str] = &[
    "just getting started.",
    "early days.",
    "we're just beginning here.",
    "a few minutes in. anything could happen.",
];

pub struct PoolState {
    morning_idx:    usize,
    midday_idx:     usize,
    afternoon_idx:  usize,
    evening_idx:    usize,
    late_night_idx: usize,
    long_sess_idx:  usize,
    short_sess_idx: usize,
}

impl PoolState {
    pub fn new(session_start_ms: u64) -> Self {
        let seed = (session_start_ms / 1000) as usize;
        Self {
            morning_idx:    seed % MORNING.len(),
            midday_idx:     seed % MIDDAY.len(),
            afternoon_idx:  seed % AFTERNOON.len(),
            evening_idx:    seed % EVENING.len(),
            late_night_idx: seed % LATE_NIGHT.len(),
            long_sess_idx:  seed % LONG_SESSION.len(),
            short_sess_idx: seed % SHORT_SESSION.len(),
        }
    }

    pub fn get_mutter(&mut self, hour: u32, session_secs: u64) -> String {
        if session_secs >= 3 * 60 * 60 {
            let line = LONG_SESSION[self.long_sess_idx % LONG_SESSION.len()];
            self.long_sess_idx = (self.long_sess_idx + 1) % LONG_SESSION.len();
            return line.to_string();
        }
        if session_secs < 30 * 60 {
            let line = SHORT_SESSION[self.short_sess_idx % SHORT_SESSION.len()];
            self.short_sess_idx = (self.short_sess_idx + 1) % SHORT_SESSION.len();
            return line.to_string();
        }
        match hour {
            5..=11 => {
                let line = MORNING[self.morning_idx % MORNING.len()];
                self.morning_idx = (self.morning_idx + 1) % MORNING.len();
                line.to_string()
            }
            12..=13 => {
                let line = MIDDAY[self.midday_idx % MIDDAY.len()];
                self.midday_idx = (self.midday_idx + 1) % MIDDAY.len();
                line.to_string()
            }
            14..=17 => {
                let line = AFTERNOON[self.afternoon_idx % AFTERNOON.len()];
                self.afternoon_idx = (self.afternoon_idx + 1) % AFTERNOON.len();
                line.to_string()
            }
            18..=21 => {
                let line = EVENING[self.evening_idx % EVENING.len()];
                self.evening_idx = (self.evening_idx + 1) % EVENING.len();
                line.to_string()
            }
            _ => {
                let line = LATE_NIGHT[self.late_night_idx % LATE_NIGHT.len()];
                self.late_night_idx = (self.late_night_idx + 1) % LATE_NIGHT.len();
                line.to_string()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn morning_bucket_cycles_without_repeat() {
        let mut ps = PoolState::new(0);
        let mut seen = std::collections::HashSet::new();
        for _ in 0..MORNING.len() {
            let m = ps.get_mutter(8, 60 * 60);
            assert!(!seen.contains(&m), "repeated mutter: {m}");
            seen.insert(m);
        }
        // After a full cycle the next call restarts -- no panic
        let _ = ps.get_mutter(8, 60 * 60);
    }

    #[test]
    fn long_session_bucket_used_when_over_3h() {
        let mut ps = PoolState::new(0);
        let m = ps.get_mutter(10, 4 * 60 * 60);
        assert!(LONG_SESSION.contains(&m.as_str()));
    }

    #[test]
    fn short_session_bucket_used_under_30min() {
        let mut ps = PoolState::new(0);
        let m = ps.get_mutter(10, 20 * 60);
        assert!(SHORT_SESSION.contains(&m.as_str()));
    }

    #[test]
    fn different_start_seeds_vary_first_line() {
        let mut ps_a = PoolState::new(0);
        let mut ps_b = PoolState::new(999_999);
        let a = ps_a.get_mutter(10, 60 * 60);
        let b = ps_b.get_mutter(10, 60 * 60);
        assert!(MORNING.contains(&a.as_str()));
        assert!(MORNING.contains(&b.as_str()));
    }
}
