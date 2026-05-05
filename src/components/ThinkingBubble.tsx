interface ThinkingBubbleProps {
  text: string;
  creatureSize: number;
}

export default function ThinkingBubble({ text, creatureSize }: ThinkingBubbleProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: creatureSize + 2,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'rgba(255, 255, 255, 0.70)',
        letterSpacing: '0.04em',
        opacity: text ? 1 : 0,
        transition: text ? 'opacity 200ms ease' : 'opacity 300ms ease',
      }}
    >
      {text}
    </div>
  );
}
