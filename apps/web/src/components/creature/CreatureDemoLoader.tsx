'use client';

import { useState, useEffect, Component, type ReactNode } from 'react';
import CreatureDemo from './CreatureDemo';

// Catch any creature crash — rest of page stays visible
class CreatureErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

// Render only after mount — prevents SSR/hydration issues without dynamic()
export default function CreatureDemoLoader() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <CreatureErrorBoundary>
      <CreatureDemo />
    </CreatureErrorBoundary>
  );
}
