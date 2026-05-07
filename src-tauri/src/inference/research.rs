/// Static research knowledge chunks retrieved via rule-based RAG.
/// Each chunk is retrieved when the corresponding signal's |z-score| >= 1.5.
/// `research_session_time` is retrieved when session_mins > 180.

pub const TYPING_SPEED: &str =
    "typing speed reflects motor fluency and cognitive engagement. faster than baseline often \
     means the user is in a rhythm -- ideas flowing, familiar territory. slower than baseline is \
     more ambiguous: it can mean careful deliberate work, difficulty, or fatigue accumulation. \
     misleading cases: switching to a different type of task (e.g., reading vs writing) will drop \
     typing speed even if the user is sharp. hardware changes (keyboard, autocorrect) confound it. \
     look at error rate and pause frequency for context before drawing conclusions.";

pub const ERROR_RATE: &str =
    "error rate (deletion rate relative to typing) is a dual-signal. high error rate + fast typing \
     often means spark or burn -- moving fast, not catching mistakes. high error rate + slow typing \
     is more ambiguous: it can mean fatigue (motor errors accumulating) OR careful revision and \
     editing work where deletions are intentional. context: if mouse behavior is calm and steady, \
     revision work is more likely. if mouse jitter is elevated and typing speed is also below \
     baseline, fatigue is the more probable explanation.";

pub const MOUSE_SPEED: &str =
    "mouse speed reflects task confidence and urgency. faster than baseline can mean the user is \
     navigating familiar territory quickly, or feeling impatient/stressed. slower than baseline \
     suggests careful deliberate work, or a slower-paced moment. hardware and task confounds: \
     switching to a drawing or precision task drops mouse speed even for a calm, focused user. \
     mouse speed alone is weak evidence. pair with mouse jitter and typing behavior.";

pub const MOUSE_JITTER: &str =
    "mouse jitter (movement irregularity) is a stress and fatigue motor signal. elevated jitter \
     with fast mouse speed may indicate urgency or agitation. elevated jitter with slow mouse \
     speed is more suggestive of fine motor fatigue or tension. device noise can produce false \
     jitter readings on some hardware. the signal is most useful when it persists across multiple \
     minutes and correlates with other elevated signals.";

pub const PAUSE_FREQUENCY: &str =
    "pause frequency (keyboard pauses per minute) reflects cognitive processing load. more pauses \
     than baseline can mean the user is thinking deeply between bursts -- a healthy sign of \
     engaged work -- or it can mean they are stuck and stalling. fewer pauses than baseline \
     suggests either a rhythm (ideas come fast, few stops) or autopilot (mechanical repetitive \
     work). context: in focus and deep states, elevated pauses are usually positive. in fade \
     states, elevated pauses combined with slowing typing suggests genuine difficulty.";

pub const APP_SWITCH_RATE: &str =
    "app switching rate reflects attention management. more switching than baseline has two main \
     interpretations: fragmented attention / overload, or expert coordination across tools. \
     distinguishing factor: if error rate is elevated and typing rhythm is erratic, overload is \
     more likely. if typing speed and quality remain steady despite switching, the user is \
     probably coordinating effectively. job type matters heavily -- developers, researchers, and \
     communicators switch more by default. slow switching relative to baseline often means deep \
     single-window engagement, which is usually a positive focus signal.";

pub const SESSION_TIME: &str =
    "session duration context: after 3+ hours, the meaning of signals shifts. fatigue signals \
     (slower typing, rising errors, elevated jitter) become more likely and more interpretable. \
     a small error rate increase at hour 4 carries different weight than the same increase at \
     minute 30. sustained focus signals at 3+ hours are genuinely notable -- they represent \
     above-average sustained engagement. if burn state signals appear late in a long session, \
     they are more credibly fatigue-driven than performance-driven.";

/// Returns the research chunk for a signal if its |z-score| warrants retrieval.
/// Returns `None` if the signal is unknown or z is not notable enough.
pub fn chunk_for_signal(signal: &str, z: f64) -> Option<&'static str> {
    if z.abs() < 1.5 {
        return None;
    }
    match signal {
        "typing_speed"    => Some(TYPING_SPEED),
        "error_rate"      => Some(ERROR_RATE),
        "mouse_speed"     => Some(MOUSE_SPEED),
        "mouse_jitter"    => Some(MOUSE_JITTER),
        "pause_frequency" => Some(PAUSE_FREQUENCY),
        "app_switch_rate" => Some(APP_SWITCH_RATE),
        _                 => None,
    }
}
