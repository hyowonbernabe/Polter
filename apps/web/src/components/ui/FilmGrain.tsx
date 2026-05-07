'use client';

export function FilmGrain() {
  return (
    <div
      className="film-grain"
      aria-hidden="true"
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '300%',
        height:        '300%',
        zIndex:        9999,
        pointerEvents: 'none',
        opacity:       0.08,
        backgroundImage: 'url(/assets/noise-grain.bmp)',
        backgroundRepeat: 'repeat',
        animation:     'grainJitter 1.2s steps(8) infinite',
      }}
    />
  );
}
