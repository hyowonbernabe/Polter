// Wisp.jsx — pixel sprite + radial bloom + breathing animation.
// Click handler is wired by parent.

function Wisp({ state, onClick, opacity = 0.95 }) {
  const s = window.WISP_DATA.STATES[state];
  const wispStyles = {
    btn: {
      position: 'relative',
      width: 96, height: 144,
      border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity,
      transition: 'opacity 320ms cubic-bezier(0.16,1,0.3,1)',
    },
    bloom: {
      position: 'absolute',
      width: 140, height: 140,
      borderRadius: '50%',
      background: `radial-gradient(circle, rgba(${s.bloom},0.55) 0%, rgba(${s.bloom},0.18) 35%, transparent 70%)`,
      filter: 'blur(8px)',
      pointerEvents: 'none',
      animation: 'wisp-bloom-pulse 4000ms ease-in-out infinite',
    },
    sprite: {
      position: 'relative',
      width: 64, height: 128,         // 16x32 base × 4
      imageRendering: 'pixelated',
      animation: 'wisp-breathe 4000ms ease-in-out infinite',
      filter: `drop-shadow(0 0 6px ${s.glow})`,
    },
  };

  return (
    <button onClick={onClick} style={wispStyles.btn} aria-label={`wisp · ${s.label}`}>
      <div style={wispStyles.bloom} />
      <img src={s.sprite} style={wispStyles.sprite} alt="" />
    </button>
  );
}

window.Wisp = Wisp;
