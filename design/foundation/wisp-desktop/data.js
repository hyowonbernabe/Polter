// Sample data, in voice. Lowercase, observational, never prescriptive.

const STATES = {
  focus: { label: 'focusing', sprite: 'sprites/wisp-focus.png',
           color: '#6fb6d9', glow: 'rgba(111,182,217,0.55)',
           bloom: '111,182,217' },
  calm:  { label: 'drifting', sprite: 'sprites/wisp-calm.png',
           color: '#7c92e8', glow: 'rgba(124,146,232,0.50)',
           bloom: '124,146,232' },
  deep:  { label: 'in flow',  sprite: 'sprites/wisp-deep.png',
           color: '#9b7fe0', glow: 'rgba(155,127,224,0.55)',
           bloom: '155,127,224' },
  spark: { label: 'engaged',  sprite: 'sprites/wisp-spark.png',
           color: '#e8b86a', glow: 'rgba(232,184,106,0.60)',
           bloom: '232,184,106' },
  burn:  { label: 'burning',  sprite: 'sprites/wisp-burn.png',
           color: '#e89466', glow: 'rgba(232,148,102,0.55)',
           bloom: '232,148,102' },
  fade:  { label: 'fading',   sprite: 'sprites/wisp-fade.png',
           color: '#8a8298', glow: 'rgba(138,130,152,0.40)',
           bloom: '138,130,152' },
  rest:  { label: 'resting',  sprite: 'sprites/wisp-rest.png',
           color: '#5d6478', glow: 'rgba(93,100,120,0.30)',
           bloom: '93,100,120' },
};

const INSIGHTS = {
  focus: {
    title: 'noticed',
    body: "you've held one window for forty-three minutes. that's the longest you've gone all week.",
    when: '14:22',
  },
  calm: {
    title: 'noticed',
    body: "you've been still for a while. that's unusual for a tuesday.",
    when: '11:08',
  },
  deep: {
    title: 'noticed',
    body: 'three days in a row, you opened figma between 9 and 10pm.',
    when: '21:34',
  },
  spark: {
    title: 'noticed',
    body: 'you typed faster after the second coffee. you also made more mistakes.',
    when: '10:47',
  },
  burn: {
    title: 'noticed',
    body: "you've switched windows forty-seven times in the last hour. that's a lot, even for you.",
    when: '15:51',
  },
  fade: {
    title: 'noticed',
    body: 'your typing has slowed for the third time today. each time it was around the same hour.',
    when: '16:18',
  },
  rest: {
    title: 'noticed',
    body: "you haven't moved in twenty minutes. i'll wait.",
    when: '23:04',
  },
};

const DASHBOARD_DAYS = [
  { d: 'mon', focus: 142, deep: 38,  burn: 8  },
  { d: 'tue', focus: 167, deep: 52,  burn: 14 },
  { d: 'wed', focus: 98,  deep: 22,  burn: 31 },
  { d: 'thu', focus: 156, deep: 71,  burn: 6  },
  { d: 'fri', focus: 124, deep: 44,  burn: 12 },
  { d: 'sat', focus: 41,  deep: 12,  burn: 2  },
  { d: 'sun', focus: 38,  deep: 18,  burn: 0  },
];

const DASHBOARD_NOTES = [
  { when: 'tue 14:22', text: "you've been still for a while." },
  { when: 'mon 21:34', text: 'three days in a row, you opened figma late.' },
  { when: 'mon 10:47', text: 'you typed faster after the second coffee.' },
  { when: 'sun 23:04', text: "you haven't moved in twenty minutes. i'll wait." },
];

window.WISP_DATA = { STATES, INSIGHTS, DASHBOARD_DAYS, DASHBOARD_NOTES };
