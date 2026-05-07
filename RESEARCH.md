# Polter Research Evidence (2010 to May 2026)

This file explains why Polter collects each signal, what that signal can tell us, and where it can mislead us.

This review uses:
- peer reviewed papers first,
- strong preprints and books when helpful,
- studies from 2010 to May 2026,
- older classic papers when they are still important foundations.

Important ground rule:
- These signals can show patterns, not medical diagnosis.
- Polter should always compare a person against their own normal pattern over time.
- One signal alone should almost never drive a strong claim.

## How to read this file

- **Privacy level**: low / medium / high
- **Evidence strength**: high / medium / low
- **Recommendation**:
  - **KEEP** = strong enough to use as a core signal
  - **TRIM** = useful only as background context or low weight
  - **CUT** = weak or too easy to misread for this product
  - **DEFERRED** = future feature, not for current release

---

## Tier 1 (automatic) - evidence and decisions

| Signal | Why collect it | What it can tell us | Where it can mislead us | Privacy | Evidence | Recommendation |
|---|---|---|---|---|---|---|
| Keystroke timing and key hold time | Strong behavior marker without reading text content | Fatigue shifts, stress load changes, slower or unstable motor rhythm | Keyboard hardware, app lag, and personal style can look like state change | High | High | KEEP |
| Typing pauses and rhythm | Good marker for thinking flow vs stop-start behavior | Planning load, hesitation periods, deep drafting stretches | Pauses can mean healthy thinking, not struggle | High | Medium-High | KEEP |
| Backspace/delete frequency | Captures correction pressure without content | Rework pressure, uncertainty, or careful editing mode | High editing can be high quality work, not stress | Medium-High | Medium | KEEP |
| Undo/redo frequency | Useful signal for reversal behavior | Rethinking, trial-and-error interaction | Very dependent on app design and user habit | Low-Medium | Low-Medium | TRIM |
| Shortcut usage frequency | Helps identify workflow style and experience level | Expert flow habits, keyboard-first efficiency style | Low shortcut use is often preference, not poor state | Low | Medium for skill; low for stress | TRIM |
| Deletion-to-creation ratio | Good edit-vs-draft ratio | Heavy rewrite periods vs smooth creation periods | Changes with task type and document phase | Medium | Low-Medium | TRIM |
| Caps Lock frequency | Very sparse signal | Almost nothing reliable at user state level | Rare and context-specific | Low | Low | CUT |
| Mouse speed and path efficiency | Strong non-text behavior signal | Confidence vs noisy movement, strain trends | Mouse settings, surface, and app layout can distort it | High | Medium-High | KEEP |
| Micro-jitter and tremor | Useful fine-grain movement quality cue | Stress-like motor noise or fatigue-like instability | Device noise can mimic human jitter | High | Medium-High | KEEP |
| Click frequency | General activity intensity cue | Busy interaction periods | Weak alone and highly task-driven | Medium | Low | TRIM |
| Cursor idle time | Useful pause and disengagement context | Break-like quiet periods, attention gaps | Idle can be reading, thinking, or user away | Low-Medium | Medium | KEEP |
| Scroll speed and pattern | Can indicate scan vs read style | Fast skim periods vs careful reading periods | Content type drives this more than mental state | Low-Medium | Low | TRIM |
| Scroll depth | Sometimes useful for reading behavior context | Surface browsing vs deep reading stretches | Weak outside page-like tasks | Low-Medium | Low | TRIM |
| Right-click frequency | Very weak interaction cue | Small hint of workflow style | Usually too app-specific to trust | Low | Low | CUT |
| Mouse text selection frequency | Revision and comparison behavior cue | Editing intensity in text-heavy work | Noisy for general desktop use | Medium | Medium in writing; low in general desktop | TRIM |
| Zoom level change frequency | Sparse behavior signal | Occasional readability adjustment context | Too rare and tool-specific in most users | Low | Low | CUT |
| Active app name + dwell time | Strong focus context signal | Time allocation, sustained focus blocks, app-heavy days | App names can hide different real tasks | High | High | KEEP |
| App switching frequency and order | Strong interruption burden signal | Context switching load and fragmentation | Some jobs require constant switching | High | High | KEEP |
| System idle time | Core break/recovery signal | Recovery windows, disengagement windows | Idle also includes reading or meetings | Low | Medium-High | KEEP |
| CPU and memory usage level | Useful confound context | Machine stress that can affect behavior signals | Mostly machine-state, not user-state | Low | Medium-Low | TRIM |
| Battery drain rate | Weak context signal | Mobility and heavy workload hints | Desktop relevance is limited | Low | Low-Medium | TRIM |
| Time of day | Core context for rhythm | Daily pattern, late-night strain risk | Shift schedules can invert patterns | Low | High | KEEP |
| Session start/end times | Core work rhythm signal | Regularity, overrun days, boundary pressure | Role and family schedules differ widely | Medium | Medium-High | KEEP |
| Break duration and frequency | Strong wellbeing signal | Recovery behavior and overload risk | Not all breaks restore energy equally | Low-Medium | High | KEEP |
| Time to first break | Good early strain signal | Whether user pushes too long at session start | Some users work best with long first block | Low | Medium | KEEP |
| Open window/tab count | Cognitive clutter context signal | Parallel load and task sprawl | Many open items can still be normal | High | Medium | TRIM |
| Window management patterns | Layout behavior context | Single-task vs split-screen work style | Weak alone; often setup-driven | Medium | Low | TRIM |
| Notification response speed | Strong reactivity signal | Interruptibility and distraction pressure | Slow response can mean deep focus, not overload | High | High | KEEP |
| Display brightness and night mode | Useful sleep hygiene context | Late-day visual strain risk context | Effects vary by person and habit | Low | Medium-High | KEEP |
| Audio device state (headphones/volume) | Useful environment context | Solo-focus vs shared-space mode hints | Weak direct link to stress or focus quality | Low-Medium | Medium | TRIM |
| Power source (plugged vs battery) | Device context | Mobility mode and session setting context | Weak direct meaning on user state | Low | Low-Medium | TRIM |
| Multi-monitor switching | Useful work-structure context | Parallel workflow and divided attention patterns | Setup and role heavily influence this | Low-Medium | Medium | KEEP |
| Network activity level (coarse only) | Lightweight context signal | Online-heavy vs offline-heavy periods | Very weak without content context | Medium | Low-Medium | TRIM |
| File save frequency | Limited and noisy signal | In some users, can reflect caution rhythm | Auto-save and app behavior can remove meaning | Medium | Low | CUT |
| Screenshot frequency | Weak for core state inference | Research/documentation mode hints | Very ambiguous and easy to overread | High | Low-Medium | CUT |

---

## Tier 2 (opt-in) - evidence and decisions

| Signal | Why collect it | What it can tell us | Where it can mislead us | Privacy | Evidence | Recommendation |
|---|---|---|---|---|---|---|
| Screen content type classification (coarse labels only) | Adds task-type context that app-name alone misses | Writing vs reading vs call vs browsing mode context | Classifier errors and mixed-window scenes are common | High | Medium | KEEP (strict local-only, no raw image storage) |
| Clipboard action frequency (no content) | Adds research/synthesis context | Information transfer intensity | High copy/paste can mean expert workflow or confusion | Medium | Medium | TRIM |
| Calendar context (meeting proximity and density) | Strong context for pre-meeting strain and meeting-heavy fatigue | Meeting pressure periods and interpretation guardrails | Meeting count is not meeting quality | Medium | High | KEEP |

---

## Tier 3 (deferred) - evidence and decisions

These are future-only signals and require explicit permission.

| Signal | Why collect it | What it can tell us | Where it can mislead us | Privacy | Evidence | Recommendation |
|---|---|---|---|---|---|---|
| Camera heart rate estimate from face video | Adds physical arousal context | Elevated stress-like physiology trend | Motion and light changes can break quality | High | Medium-High | DEFERRED (TRIM use, strict quality checks) |
| Camera breathing estimate | Adds physical regulation context | Strain and calming trend windows | Harder and less stable than pulse | High | Medium | DEFERRED (TRIM use) |
| Screen distance and posture proxy | Ergonomic and strain context | Lean-in strain trend, posture drift | Camera angle and body variation create error | High | Medium | DEFERRED (TRIM use) |
| Looking-away frequency | Possible attention context | Attention shift trend | Looking away can also mean healthy thinking | High | Low-Medium | DEFERRED (CUT for strong claims) |
| Head movement pattern | Extra context | Possible engagement changes | Too noisy for direct interpretation | High | Low-Medium | DEFERRED (TRIM) |
| Lighting change detection | Environment-change cue | Sudden environment shift context | Rarely useful as a primary insight | Medium | Low-Medium | DEFERRED (TRIM) |
| Another person in frame (boolean only) | Helps guard against bad interpretation | Social context override for inference | Very sensitive bystander risk | High | Low-Medium | DEFERRED (CUT by default; consider only with explicit clear value) |
| Ambient sound level (no recording) | Strong environment load signal | Noise burden and interruption pressure context | Loudness alone misses sound type | Medium | High | DEFERRED (KEEP) |
| Speech present (yes/no only) | Meeting/call context | Social load period context | Speech presence does not mean user speaking | Medium-High | Medium | DEFERRED (TRIM) |
| Music present (yes/no only) | Context modifier | Background stimulation context | Effects depend on task and user preference | Medium | Medium-Low | DEFERRED (TRIM) |
| Call in progress (boolean estimate) | Strong interpretation guardrail | Helps avoid false insight during calls | Hard to detect perfectly without extra context | Medium-High | Medium | DEFERRED (KEEP) |
| Silence duration | Context signal | Quiet windows and break-like periods | Very ambiguous by itself | Medium | Low-Medium | DEFERRED (TRIM) |

---

## Derived signals (computed, not directly collected)

These should stay because they combine multiple weak signals into stronger patterns.

| Derived signal | Why it is useful | Evidence strength | Recommendation |
|---|---|---|---|
| Error recovery speed | Captures bounce-back after strain moments | Medium | KEEP |
| Decision latency | Captures hesitation trend over time | Medium | KEEP |
| Weekend vs weekday pattern | Captures work-boundary shape | Medium | KEEP |
| End-of-day wind-down pattern | Captures disengagement quality | Medium | KEEP |
| Focus session quality score | Combines many weak cues into one stable cue | High (as combined metric approach) | KEEP |
| Pre-meeting stress signature | Uses calendar + input changes to explain spikes | Medium-High | KEEP |

---

## Nearby signals to improve Polter later (no content collection)

Ranked by expected value vs privacy cost:

1. App-switching rate windows (already partly present, can be weighted better) - high value, medium privacy.
2. Notification burst rate - high value, medium privacy.
3. Focus stretch length (uninterrupted active blocks) - high value, low-medium privacy.
4. Sleep/wake regularity from system events - medium-high value, medium privacy.
5. Idle-break pattern quality (short recharge vs long drift) - medium value, low-medium privacy.
6. Mic/camera on-time state only (no content) - medium value, medium-high privacy.
7. Input-mix shift (keyboard-heavy vs mouse-heavy periods) - medium value, low privacy.

---

## Most important contradictions to remember

1. The same signal can mean different things for different people.
2. Fast app switching can mean overload, or it can mean expert coordination work.
3. Slow notification response can mean deep focus, not disengagement.
4. High deletion can mean struggle, or careful high-quality editing.
5. Camera and microphone signals are technically possible but easy to over-interpret.
6. Group-level findings are much stronger than individual one-shot prediction.

Practical rule:
- Use personal baseline + multi-signal agreement + confidence labels.
- Do not make strong claims from one signal.

---

## Why a desktop companion works

These studies support the core product concept: that a quiet, passive presence that watches your patterns (without reading content) can change how you work.

| Concept | What the research found | Where it can mislead | Evidence | Source |
|---|---|---|---|---|
| Social facilitation (co-presence) | People perform better on practiced or familiar tasks when another entity is present, even if that entity does nothing. Confirmed across 241 studies. | Complex or unfamiliar tasks can get worse under observation. Polter should avoid adding pressure during learning-mode work. | High | Zajonc (1965) · Science; Bond & Titus (1983) · Psychological Bulletin |
| Passive self-monitoring | Wearing a pedometer without setting a goal increased daily walking by ~27% (~2,000 extra steps). Passive awareness alone drives behavior change. | The effect fades if the feedback becomes ignorable or routine. Polter must vary its observations to avoid habituation. | High | Bravata et al. (2007) · Stanford · JAMA |
| Burnout self-awareness | Burnout develops gradually. People consistently underestimate their own exhaustion. By the time someone notices, they have usually been declining for a while. | Self-report tools can undercount burnout, but external signals can also overcount it (bad day vs real burnout). Polter should track trends, not single bad sessions. | High (for concept) | Maslach (1981+) · UC Berkeley · Maslach Burnout Inventory |
| Digital creature bonding | People form genuine emotional attachments to virtual pets and digital creatures. Older adults interacting with a robot pet showed reduced loneliness comparable to a live dog. | Attachment can become obligation. Polter should never guilt the user for ignoring it or being away. | Medium-High | Banks et al. (2008) · Saint Louis University · JAMDA |
| Workplace pets and stress | Employees who brought dogs to work had measurably lower cortisol (stress hormone) levels throughout the day compared to those who did not. | The effect was measured with real animals, not digital ones. Transfer to a screen companion is plausible but not directly proven. | High | Barker et al. (2012) · Virginia Commonwealth University · IJWHM |

Practical rule:
- Polter is a passive presence, not a coach. It should feel like company, not supervision.
- Social facilitation works best when the observer is non-judgmental. Polter should never feel like it is grading the user.

---

## Source list (most important papers and reviews)

### Companion presence, passive monitoring, and burnout
- [Zajonc (1965) - Social facilitation](https://doi.org/10.1126/science.149.3681.269)
- [Bond and Titus (1983) - Social facilitation: A meta-analysis of 241 studies](https://doi.org/10.1037/0033-2909.93.2.265)
- [Bravata et al. (2007) - Using pedometers to increase physical activity](https://doi.org/10.1001/jama.298.19.2296)
- [Maslach and Jackson (1981) - The measurement of experienced burnout](https://doi.org/10.1002/job.4030020205)
- [Banks et al. (2008) - Animal-assisted therapy and loneliness in nursing homes](https://doi.org/10.1016/j.jamda.2007.09.007)
- [Barker et al. (2012) - Preliminary investigation of employee stress in dogs at workplace](https://doi.org/10.1108/17538351211215366)

### Keyboard and mouse behavior
- [Giancardo et al. (2016) - Computer keyboard interaction as indicator of early Parkinson's disease](https://doi.org/10.1038/srep34468)
- [Zulueta et al. (2018) - Predicting mood disturbance with mobile phone keystroke metadata](https://doi.org/10.2196/jmir.9775)
- [Vesel et al. (2020) - Effects of mood and aging on keystroke dynamics metadata](https://doi.org/10.1093/jamia/ocaa057)
- [de Jong et al. (2020) - Typewriting performance reflects mental fatigue in office work](https://doi.org/10.1371/journal.pone.0239984)
- [Epp et al. (2011) - Identifying emotional states using keystroke dynamics](https://doi.org/10.1145/1978942.1979046)
- [Leijten and Van Waes (2013) - Keystroke logging in writing research](https://doi.org/10.1177/0741088313491692)
- [Freeman and Ambady (2010) - MouseTracker method paper](https://doi.org/10.3758/BRM.42.1.226)
- [Killourhy and Maxion (2009) - Keystroke benchmark methods](https://doi.org/10.1109/DSN.2009.5270346)

### Interruption, focus, and work pattern context
- [Gonzalez and Mark (2004) - Constant multitasking in office work](https://dl.acm.org/doi/10.1145/985692.985707)
- [Mark et al. (2008) - The cost of interrupted work](https://dl.acm.org/doi/10.1145/1357054.1357072)
- [Iqbal and Horvitz (2007) - Disruption and recovery of computing tasks](https://www.microsoft.com/en-us/research/publication/disruption-and-recovery-of-computing-tasks/)
- [Bailey and Konstan (2006) - Attention-aware systems for interruption timing](https://dl.acm.org/doi/10.1145/1124772.1124855)
- [Leroy (2009) - Attention residue](https://journals.aom.org/doi/10.5465/amj.2009.37308058)
- [Albulescu et al. (2022) - Micro-breaks meta-analysis](https://doi.org/10.1371/journal.pone.0272460)
- [Ariga and Lleras (2011) - Brief breaks and sustained attention](https://doi.org/10.1016/j.cognition.2010.12.007)

### Notifications, digital phenotyping, and behavior sensing
- [Pielot et al. (2014) - Mobile notification behavior at scale](https://dl.acm.org/doi/10.1145/2556288.2557189)
- [Kushlev and Dunn (2015) - Checking email less frequently reduces stress](https://doi.org/10.1016/j.chb.2014.11.005)
- [Onnela and Rauch (2016) - Digital phenotyping framework](https://doi.org/10.1038/npp.2016.7)
- [Cornet and Holden (2018) - Systematic review of smartphone behavior and mental health](https://doi.org/10.1016/j.jbi.2017.12.008)
- [Saeb et al. (2015) - Mobile phone sensor correlates of depressive symptom severity](https://www.jmir.org/2015/7/e175/)

### Meetings and calendar context
- [Luong and Rogelberg (2005) - Meetings and employee outcomes](https://doi.org/10.1037/1089-2699.9.1.58)
- [Fauville et al. (2021) - Zoom Exhaustion and Fatigue Scale](https://doi.org/10.1016/j.chbr.2021.100119)
- [Allen et al. (2026) - Thirty years of meeting science (review)](https://www.annualreviews.org/content/journals/10.1146/annurev-orgpsych-012225-121752)

### Screen and environment context
- [Ram et al. (2020) - Screenomics](https://doi.org/10.1177/0743558419883362)
- [Chang et al. (2015) - Evening e-reader light and sleep biology](https://doi.org/10.1073/pnas.1418490112)
- [Downie et al. (2023) - Blue-light blocking lenses review](https://doi.org/10.1002/14651858.CD013244.pub2)
- [Szalma and Hancock (2011) - Noise effects on human performance (meta-analysis)](https://doi.org/10.1037/a0023987)
- [Basner et al. (2014) - Auditory and non-auditory effects of noise on health](https://doi.org/10.1016/S0140-6736(13)61613-X)

### Camera and microphone (deferred)
- [Poh et al. (2010) - Contactless pulse from video](https://doi.org/10.1364/OE.18.010762)
- [de Haan and Jeanne (2013) - Motion-robust pulse from chrominance](https://doi.org/10.1109/TBME.2013.2266196)
- [Rouast et al. (2018) - Remote photoplethysmography review](https://doi.org/10.1007/s11704-016-6243-6)
- [Chen and McDuff (2018) - DeepPhys video-based physiology](https://openaccess.thecvf.com/content_ECCV_2018/html/Weixuan_Chen_DeepPhys_Video-Based_Physiological_ECCV_2018_paper.html)
- [Smallwood and Schooler (2015) - Mind wandering review](https://doi.org/10.1146/annurev-psych-010814-015331)
- [Kampfe et al. (2011) - Background music and cognitive performance (meta-analysis)](https://doi.org/10.1177/0305735610376261)

---

## Final product guidance from research

If Polter wants accurate and trustworthy insights:

1. Keep core behavior signals that have strong support.
2. Keep weak signals only as light context modifiers.
3. Avoid claims that sound medical or absolute.
4. Show confidence levels in user-facing insight text.
5. Prefer explanations like: "this pattern may suggest..." not "this means...".
6. Keep all high-risk signals local, short-lived, and revocable.
