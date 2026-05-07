'use client';

interface CandleProps {
  size?: number;
  rotation?: number;
  floatPhase?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function Candle({ size = 64, rotation = 0, floatPhase = 0, style, className }: CandleProps) {
  return (
    <div
      className={`candle-float ${className ?? ''}`}
      style={{
        position: 'relative',
        width:    size,
        height:   size * 1.4,
        transform: `rotate(${rotation}deg)`,
        // Float phase offset via animation-delay
        animationDelay: `${floatPhase}s`,
        ...style,
      }}
    >
      {/* Glow behind candle */}
      <div
        className="candle-glow"
        style={{
          position:      'absolute',
          top:           '-30%',
          left:          '50%',
          transform:     'translateX(-50%)',
          width:         size * 3,
          height:        size * 3,
          borderRadius:  '50%',
          background:    'radial-gradient(circle, rgba(255,180,60,0.18) 0%, rgba(255,140,30,0.06) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      {/* Candle image */}
      <img
        src="/assets/candle.png"
        alt=""
        style={{
          width:          '100%',
          height:         '100%',
          objectFit:      'contain',
          imageRendering: 'pixelated',
          position:       'relative',
          zIndex:         1,
        }}
      />
    </div>
  );
}
