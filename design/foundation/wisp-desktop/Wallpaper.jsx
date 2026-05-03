// Wallpaper.jsx — a fake desktop background so we can show transparency.
// Soft photographic-feel gradient that mimics a low-saturation wallpaper at night.

function Wallpaper() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(ellipse at 20% 30%, #1a2540 0%, transparent 55%),' +
        'radial-gradient(ellipse at 80% 70%, #2a1f3a 0%, transparent 55%),' +
        'radial-gradient(ellipse at 50% 50%, #0f1a2c 0%, #050811 100%)',
      overflow: 'hidden',
      zIndex: 0,
    }}>
      {/* faint noise / starfield */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(noise.png)',
        backgroundRepeat: 'repeat',
        opacity: 0.4,
        mixBlendMode: 'screen',
      }} />
      {/* fake "dock" hint at bottom to sell the desktop */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)',
        width: 360, height: 44, borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: 7,
            background: `hsl(${200 + i * 24}, 30%, ${30 + i * 3}%)`,
            opacity: 0.7,
          }} />
        ))}
      </div>
    </div>
  );
}

window.Wallpaper = Wallpaper;
