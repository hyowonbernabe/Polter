'use client';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function ScrollReveal({ children, delay = 0, className = '' }: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${isVisible ? 'reveal-visible' : 'reveal-hidden'} ${className}`}
      style={isVisible && delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
