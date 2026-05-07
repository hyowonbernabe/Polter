'use client';

import dynamic from 'next/dynamic';

const CreatureDemo = dynamic(() => import('./CreatureDemo'), { ssr: false });

export default function CreatureDemoLoader() {
  return <CreatureDemo />;
}
