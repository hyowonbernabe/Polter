'use client';
import { useEffect, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface MetricProps {
  target: string;
  label:  string;
  delay:  number;
}

function Metric({ target, label, delay }: MetricProps) {
  const { ref, isVisible } = useScrollReveal();
  const [shown, setShown]  = useState(false);

  useEffect(() => {
    if (isVisible && !shown) {
      const t = setTimeout(() => setShown(true), delay);
      return () => clearTimeout(t);
    }
  }, [isVisible, shown, delay]);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{ paddingBottom: 'var(--sp-7)' }}
    >
      <div
        style={{
          fontFamily:  'var(--font-mono)',
          fontSize:    64,
          lineHeight:  1,
          color:       'var(--fg-ink)',
          opacity:     shown ? 1 : 0,
          transform:   shown ? 'none' : 'translateY(4px)',
          transition:  `opacity 600ms var(--ease-quiet) ${delay}ms, transform 600ms var(--ease-quiet) ${delay}ms`,
        }}
      >
        {target}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize:   15,
          color:      'var(--fg-ink-2)',
          marginTop:  'var(--sp-3)',
          maxWidth:   '38ch',
          lineHeight: 1.5,
          opacity:    shown ? 1 : 0,
          transition: `opacity 400ms var(--ease-quiet) ${delay + 200}ms`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function Lightweight() {
  return (
    <section style={{ background: 'var(--bg-light)', padding: 'var(--sp-9) clamp(24px, 6vw, 80px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 'var(--sp-8)', alignItems: 'start', maxWidth: 900 }}>
      <div>
        <div className="eyebrow mb-4" style={{ color: 'var(--fg-ink-3)' }}>lightweight</div>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(22px, 2.8vw, 36px)',
            lineHeight:    1.2,
            letterSpacing: '-0.02em',
            color:         'var(--fg-ink)',
            textTransform: 'lowercase',
            margin:        '0 0 var(--sp-8)',
          }}
        >
          you won&apos;t notice it&apos;s there.
        </h2>

        <Metric
          target="&lt; 1%"
          label="cpu usage while running. no impact on gaming, editing, or heavy workloads."
          delay={0}
        />
        <Metric
          target="0 bytes"
          label="sent to any server. ever. all processing happens on your machine."
          delay={200}
        />
        <Metric
          target="60 seconds"
          label="aggregation window. raw events are discarded. only the rhythm remains."
          delay={400}
        />
      </div>
      {/* Asset #6: feather — tall portrait (~1:2), transparent bg, floats beside metrics */}
      <img
        src="https://placehold.co/120x240"
        alt="feather placeholder"
        style={{ width: 120, borderRadius: 'var(--radius-md)', marginTop: 'var(--sp-8)', opacity: 0.6 }}
      />
      </div>
    </section>
  );
}
