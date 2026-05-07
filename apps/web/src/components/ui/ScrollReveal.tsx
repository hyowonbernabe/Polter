'use client';
import { useScrollReveal } from '@/hooks/useScrollReveal';

type RevealVariant = 'fade-up' | 'fade-in' | 'drift-left' | 'drift-right' | 'scale' | 'glow';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  variant?: RevealVariant;
  className?: string;
}

const HIDDEN_STYLES: Record<RevealVariant, React.CSSProperties> = {
  'fade-up': { opacity: 0, transform: 'translateY(24px)' },
  'fade-in': { opacity: 0 },
  'drift-left': { opacity: 0, transform: 'translateX(40px)' },
  'drift-right': { opacity: 0, transform: 'translateX(-40px)' },
  'scale': { opacity: 0, transform: 'scale(0.92)' },
  'glow': { opacity: 0, transform: 'translateY(12px)', filter: 'blur(6px)' },
};

const VISIBLE_STYLES: Record<RevealVariant, React.CSSProperties> = {
  'fade-up': { opacity: 1, transform: 'translateY(0)' },
  'fade-in': { opacity: 1 },
  'drift-left': { opacity: 1, transform: 'translateX(0)' },
  'drift-right': { opacity: 1, transform: 'translateX(0)' },
  'scale': { opacity: 1, transform: 'scale(1)' },
  'glow': { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
};

export function ScrollReveal({
  children,
  delay = 0,
  variant = 'fade-up',
  className = '',
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal();
  const base = isVisible ? VISIBLE_STYLES[variant] : HIDDEN_STYLES[variant];

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        ...base,
        transition: [
          `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          `transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          `filter 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        ].join(', '),
        willChange: 'opacity, transform, filter',
      }}
    >
      {children}
    </div>
  );
}
