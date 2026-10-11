/* Accessible navigation and focus for the experiment workbench. */
(() => {
  'use strict';
  const bar = document.getElementById('workspaceTabs');
  if (!bar) return;
  const button = document.getElementById('focusWorkspace');
  function focus(enabled) {
    document.body.classList.toggle('workspace-focused', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? '離開專注模式 ↙' : '專注工作區 ↗';
    window.dispatchEvent(new Event('resize'));
    if (enabled) bar.scrollIntoView({block: 'start', behavior: 'instant'});
  }
  button.addEventListener('click', () => focus(button.getAttribute('aria-pressed') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('workspace-focused')) focus(false);
  });
  const links = [...bar.querySelectorAll('a[href^="#"]')];
  function activate(id) {
    for (const link of links) {
      if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  for (const link of links) link.addEventListener('click', () => activate(link.hash.slice(1)));
  if ('IntersectionObserver' in window) {
    const positions = new Map();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) positions.set(entry.target.id, entry);
      const visible = [...positions.values()].filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) activate(visible[0].target.id);
    }, {rootMargin: '-70px 0px -35% 0px', threshold: 0});
    for (const link of links) {
      const section = document.getElementById(link.hash.slice(1));
      if (section) observer.observe(section);
    }
  }
})();
