(() => {
  const scenes = Array.from(document.querySelectorAll('[data-living-scene]'));
  if (!scenes.length) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const harbor = document.querySelector('.harbor-backdrop');
  const plane = harbor?.querySelector('.resort-plane');
  const layoutFlight = () => {
    const matrix = harbor?.getScreenCTM();
    if (!plane || !matrix) return;
    // Use the visible SVG viewport, including cover cropping, rather than the
    // full artwork bounds. Keep both ends of the flight inside the visible sky.
    const bounds = harbor.getBoundingClientRect();
    const inverse = matrix.inverse();
    const start = new DOMPoint(bounds.left, bounds.top).matrixTransform(inverse);
    const end = new DOMPoint(bounds.right, bounds.bottom).matrixTransform(inverse);
    const height = end.y - start.y;
    plane.style.setProperty('--flight-start-x', `${end.x + 55}px`);
    plane.style.setProperty('--flight-end-x', `${start.x - 55}px`);
    plane.style.setProperty('--flight-start-y', `${start.y + height * .33}px`);
    plane.style.setProperty('--flight-end-y', `${start.y + height * .26}px`);
  };
  if (plane) {
    layoutFlight();
    if ('ResizeObserver' in window) new ResizeObserver(layoutFlight).observe(harbor);
    else window.addEventListener('resize', layoutFlight);
  }
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
