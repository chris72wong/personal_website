(() => {
  const scenes = Array.from(document.querySelectorAll('[data-living-scene]'));
  if (!scenes.length) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const harbor = document.querySelector('.harbor-backdrop');
  const plane = harbor?.querySelector('.resort-plane');
  const projectCards = document.querySelector('.harbor-projects');
  const desktopLayout = window.matchMedia('(hover: hover) and (pointer: fine)');
  const layoutFlight = () => {
    // Crop excess sky on desktop so the buildings clear the project cards.
    // Touch devices keep the original panoramic composition.
    let skyCrop = 0;
    if (desktopLayout.matches && harbor && projectCards) {
      const scene = harbor.getBoundingClientRect();
      const widthScale = scene.width / 1672;
      const targetBottom = projectCards.getBoundingClientRect().top - scene.top - 12;
      // Solve the cover crop with the gym floor (artwork y=660) above the cards.
      skyCrop = Math.max(140, 2 * 660 - 941 + (scene.height - 2 * targetBottom) / widthScale);
      if (scene.height / (941 - skyCrop) > widthScale) {
        skyCrop = Math.max(140, (660 * scene.height - 941 * targetBottom) / (scene.height - targetBottom));
      }
    }
    harbor?.setAttribute('viewBox', `0 ${skyCrop} 1672 ${941 - skyCrop}`);
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
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(layoutFlight);
      observer.observe(harbor);
      if (projectCards) observer.observe(projectCards);
    } else window.addEventListener('resize', layoutFlight);
    document.fonts?.ready.then(layoutFlight);
    if (desktopLayout.addEventListener) desktopLayout.addEventListener('change', layoutFlight);
    else desktopLayout.addListener(layoutFlight);
  }
  const visibility = new Map(scenes.map(scene => [scene, false]));
  const sync = () => {
    const enabled = !preference.matches && !document.hidden && !document.body.classList.contains('project-open');
    scenes.forEach(scene => scene.classList.toggle('scene-active', enabled && visibility.get(scene)));
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= .02));
      sync();
    }, { threshold: .02, rootMargin: `-${document.querySelector('.nav')?.offsetHeight || 0}px 0px 0px 0px` });
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
