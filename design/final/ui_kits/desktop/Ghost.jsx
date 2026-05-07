// Ghost.jsx — the pixel-art sprite that floats on the desktop.
// 8-direction facing, mood-tinted, gentle idle drift.

const SPRITES = {
  'front': '../../assets/ghost/front.png',
  'back': '../../assets/ghost/back.png',
  'left': '../../assets/ghost/left.png',
  'right': '../../assets/ghost/right.png',
  'front-left': '../../assets/ghost/front-left.png',
  'front-right': '../../assets/ghost/front-right.png',
  'back-left': '../../assets/ghost/back-left.png',
  'back-right': '../../assets/ghost/back-right.png',
};

const MOOD_TINT = {
  calm: '#7a9e8b',
  restless: '#c08a64',
  tired: '#8e7fa8',
  asleep: '#4f5a6e',
  curious: '#d4b87a',
};

const MOOD_OPACITY = {
  calm: 0.92,
  restless: 0.95,
  tired: 0.7,
  asleep: 0.45,
  curious: 1,
};

function Ghost({ facing = 'front', mood = 'calm', size = 96, drift = true, glow = false, onClick }) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    if (!drift) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drift]);

  // Slow sine drift, never bouncy
  const dy = drift ? Math.sin(t * (Math.PI * 2) / 4) * 6 : 0;
  const dx = drift ? Math.sin(t * (Math.PI * 2) / 6.3) * 3 : 0;

  const tint = MOOD_TINT[mood];
  const opacity = MOOD_OPACITY[mood] ?? 1;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        transform: `translate(${dx}px, ${dy}px)`,
        transition: 'opacity 600ms cubic-bezier(0.4,0,0.2,1)',
        opacity,
        cursor: onClick ? 'pointer' : 'default',
        filter: glow ? `drop-shadow(0 0 18px ${tint}88)` : 'none',
      }}
    >
      <img
        src={SPRITES[facing] ?? SPRITES.front}
        className="pixel-art"
        style={{ width: '100%', height: '100%', display: 'block' }}
        alt=""
      />
      {/* mood tint — multiply layer at very low alpha */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: tint,
          mixBlendMode: 'multiply',
          opacity: mood === 'calm' ? 0 : 0.18,
          pointerEvents: 'none',
          maskImage: `url(${SPRITES[facing] ?? SPRITES.front})`,
          WebkitMaskImage: `url(${SPRITES[facing] ?? SPRITES.front})`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          imageRendering: 'pixelated',
          transition: 'opacity 600ms cubic-bezier(0.4,0,0.2,1), background 600ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}

window.Ghost = Ghost;
window.GHOST_MOOD_TINT = MOOD_TINT;
