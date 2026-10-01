(() => {
  const scenes = Array.from(document.querySelectorAll('.hero[data-living-scene]'));
  if (!scenes.length) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visibility = new Map(scenes.map(scene => [scene, false]));
  const sync = () => {
    const enabled = !preference.matches && !document.hidden && !document.body.classList.contains('project-open');
    scenes.forEach(scene => scene.classList.toggle('scene-active', enabled && visibility.get(scene)));
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      sync();
    }, { threshold: .02 });
    scenes.forEach(scene => observer.observe(scene));
  } else {
    const measure = () => {
      scenes.forEach(scene => {
        const bounds = scene.getBoundingClientRect();
        visibility.set(scene, bounds.bottom > 0 && bounds.top < window.innerHeight);
      });
      sync();
    };
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();
  }
  if (preference.addEventListener) preference.addEventListener('change', sync);
  else preference.addListener(sync);
  document.addEventListener('visibilitychange', sync);
  if ('MutationObserver' in window) new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  sync();
})();
