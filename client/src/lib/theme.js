export function applyTheme(mode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
}
export function getTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function setTheme(mode) {
  localStorage.setItem('theme', mode);
  applyTheme(mode);
}
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
