import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-0':         'var(--bg-0)',
        'bg-1':         'var(--bg-1)',
        'bg-2':         'var(--bg-2)',
        'bg-3':         'var(--bg-3)',
        'bg-light':     'var(--bg-light)',
        'bg-paper':     'var(--bg-paper)',
        'fg-1':         'var(--fg-1)',
        'fg-2':         'var(--fg-2)',
        'fg-3':         'var(--fg-3)',
        'fg-4':         'var(--fg-4)',
        'fg-ink':       'var(--fg-ink)',
        'fg-ink-2':     'var(--fg-ink-2)',
        'fg-ink-3':     'var(--fg-ink-3)',
        'ghost':        'var(--ghost)',
        'accent':       'var(--accent)',
        'border-1':     'var(--border-1)',
        'border-light': 'var(--border-light)',
        'mood-calm':     'var(--mood-calm)',
        'mood-restless': 'var(--mood-restless)',
        'mood-tired':    'var(--mood-tired)',
        'mood-asleep':   'var(--mood-asleep)',
        'mood-curious':  'var(--mood-curious)',
        'danger':        'var(--danger)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        ui:    ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)', 'monospace'],
      },
      spacing: {
        'sp-1': 'var(--sp-1)',
        'sp-2': 'var(--sp-2)',
        'sp-3': 'var(--sp-3)',
        'sp-4': 'var(--sp-4)',
        'sp-5': 'var(--sp-5)',
        'sp-6': 'var(--sp-6)',
        'sp-7': 'var(--sp-7)',
        'sp-8': 'var(--sp-8)',
        'sp-9': 'var(--sp-9)',
      },
      borderRadius: {
        sm:     'var(--radius-sm)',
        md:     'var(--radius-md)',
        lg:     'var(--radius-lg)',
        bubble: 'var(--radius-bubble)',
      },
      transitionTimingFunction: {
        quiet: 'var(--ease-quiet)',
        drift: 'var(--ease-drift)',
      },
      transitionDuration: {
        quick: 'var(--dur-quick)',
        soft:  'var(--dur-soft)',
        slow:  'var(--dur-slow)',
        drift: 'var(--dur-drift)',
      },
    },
  },
  plugins: [],
};

export default config;
