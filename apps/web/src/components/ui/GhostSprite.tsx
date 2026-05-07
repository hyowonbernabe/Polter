interface GhostSpriteProps {
  name: string;
  scale?: 1 | 2 | 3 | 4 | 8;
  opacity?: number;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function GhostSprite({
  name,
  scale = 2,
  opacity = 1,
  flip = false,
  className = '',
  style,
}: GhostSpriteProps) {
  const size = scale * 48;
  return (
    <img
      src={`/sprites/${name}`}
      width={size}
      height={size}
      alt=""
      className={`pixel-art ${className}`}
      style={{
        opacity,
        transform: flip ? 'scaleX(-1)' : undefined,
        display: 'block',
        ...style,
      }}
    />
  );
}
