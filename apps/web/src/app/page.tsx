import { Hero }         from '@/components/sections/Hero';
import { WhatItIs }     from '@/components/sections/WhatItIs';
import { HowItWorks }   from '@/components/sections/HowItWorks';
import { TheScience }   from '@/components/sections/TheScience';
import { VoiceSamples } from '@/components/sections/VoiceSamples';
import { TheCreature }  from '@/components/sections/TheCreature';
import { Lightweight }  from '@/components/sections/Lightweight';
import { Privacy }      from '@/components/sections/Privacy';
import { DownloadCTA }  from '@/components/sections/DownloadCTA';
import { Footer }       from '@/components/sections/Footer';

export default function Home() {
  return (
    <main>
      <Hero />
      <WhatItIs />
      <HowItWorks />
      <TheScience />
      <VoiceSamples />
      <TheCreature />
      <Lightweight />
      <Privacy />
      <DownloadCTA />
      <Footer />
    </main>
  );
}
