/**
 * Smoke test — renders each section individually to catch throws.
 */
import React from 'react';
import { render } from '@testing-library/react';

global.requestAnimationFrame = (_cb: FrameRequestCallback) => 0;
global.cancelAnimationFrame  = (_id: number) => {};
global.IntersectionObserver  = class {
  observe()    {}
  disconnect() {}
  unobserve()  {}
} as unknown as typeof IntersectionObserver;

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

const sections: [string, React.ComponentType][] = [
  ['Hero',         Hero],
  ['WhatItIs',     WhatItIs],
  ['HowItWorks',   HowItWorks],
  ['TheScience',   TheScience],
  ['VoiceSamples', VoiceSamples],
  ['TheCreature',  TheCreature],
  ['Lightweight',  Lightweight],
  ['Privacy',      Privacy],
  ['DownloadCTA',  DownloadCTA],
  ['Footer',       Footer],
];

test.each(sections)('%s renders without throwing', (_name, Component) => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => { render(React.createElement(Component)); }).not.toThrow();
  spy.mockRestore();
});
