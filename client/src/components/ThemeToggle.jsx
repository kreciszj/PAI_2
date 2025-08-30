import { useEffect, useState } from 'react';
import { getTheme, toggleTheme, applyTheme } from '../lib/theme';

export default function ThemeToggle() {
  const [mode, setMode] = useState(getTheme());
  useEffect(() => { applyTheme(mode); }, []); // wyrównanie po mount

  const isDark = mode === 'dark';
  const onToggle = () => setMode(toggleTheme()); // zapis + zastosowanie w <html>

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label="Przełącz motyw"
      className={[
        'relative inline-flex h-8 w-16 items-center rounded-full transition-colors',
        'bg-neutral-300 dark:bg-neutral-700',
        isDark ? 'bg-indigo-600' : '',
        'shadow-inner ring-1 ring-black/5 dark:ring-white/10',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500',
        'focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900',
        'hover:brightness-105 active:scale-[.98]'
      ].join(' ')}
    >
      {/* suwak */}
      <span
        className={[
          'absolute left-1 top-1 h-6 w-6 rounded-full bg-white dark:bg-neutral-900',
          'shadow-md transition-transform duration-300 ease-out will-change-transform',
          isDark ? 'translate-x-8' : 'translate-x-0'
        ].join(' ')}
      />

      {/* ikony */}
      <span
        className={[
          'pointer-events-none absolute left-2 transition-opacity duration-200',
          isDark ? 'opacity-0' : 'opacity-100'
        ].join(' ')}
        aria-hidden="true"
      >
        <SunIcon />
      </span>
      <span
        className={[
          'pointer-events-none absolute right-2 transition-opacity duration-200',
          isDark ? 'opacity-100' : 'opacity-0'
        ].join(' ')}
        aria-hidden="true"
      >
        <MoonIcon />
      </span>
    </button>
  );
}

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
         stroke="currentColor" strokeWidth="2" className="text-yellow-500" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M22 12h-2M4 12H2m15.5 6.5-1.5-1.5M8 8 6.5 6.5m11 0L16.5 8M8 16l-1.5 1.5" />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"
         className="text-slate-100" {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7.2 7.2 0 0 0 21 12.8z" />
    </svg>
  );
}
