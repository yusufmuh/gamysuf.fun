'use strict';

// Load synchronously in <head> so the saved palette is selected before CSS paints.
(() => {
  const key = 'gamysuf-theme';
  const root = document.documentElement;
  const colors = {dark:'#12050c',light:'#fff9f6'};
  const icons = {
    dark:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>',
    light:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8a8.5 8.5 0 1 0 11.5 11.5Z"/></svg>'
  };

  let saved;
  try { saved = localStorage.getItem(key); } catch { saved = null; }
  let theme = saved === 'light' ? 'light' : 'dark';
  root.dataset.theme = theme;

  function paint() {
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colors[theme]);
    const button = document.getElementById('themeToggle');
    if (!button) return;
    const next = theme === 'dark' ? 'terang' : 'gelap';
    const label = `Aktifkan tema ${next}`;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(theme === 'light'));
    button.title = label;
    button.innerHTML = `${icons[theme]}<span class="theme-label">${theme === 'dark' ? 'Terang' : 'Gelap'}</span>`;
  }

  function bind() {
    paint();
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, theme); } catch { /* Theme still works for this page. */ }
      paint();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();
