(() => {
  const journey = document.querySelector('.transit-journey');
  if (!journey) return;
  const track = journey.querySelector('#transit-track');
  const cars = Array.from(journey.querySelectorAll('[data-train-car]'));
  const stops = Array.from(journey.querySelectorAll('[data-transit-stop]'));
  const markers = Array.from(journey.querySelectorAll('[data-track-stop]'));
  const landscape = journey.querySelector('.transit-landscape');
  const stopViewport = journey.querySelector('.transit-stops-viewport');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 640px)');
  if (!track?.getPointAtLength || !cars.length || !stops.length) return;

  const length = track.getTotalLength();
  const positions = stops.map(stop => Number(stop.dataset.progress));
  const start = -.02;
  const end = 1 + 290 / length;
  let progress = preference.matches ? positions[0] : start;
  let visible = !('IntersectionObserver' in window);
  let frame = null;
  let previousTime = null;
  let currentStop = -1;
  let manualScrollUntil = 0;
  // Give touch, trackpad, and keyboard exploration time before following again.
  ['pointerdown', 'wheel', 'keydown'].forEach(event => stopViewport.addEventListener(event, () => {
    manualScrollUntil = performance.now() + 8000;
  }, { passive: true }));

  // Extend the end tangents so all three cars enter and leave the scene fully.
  const pointAt = distance => {
    const clamped = Math.max(0, Math.min(length, distance));
    const point = track.getPointAtLength(clamped);
    const before = track.getPointAtLength(Math.max(0, clamped - 2));
    const after = track.getPointAtLength(Math.min(length, clamped + 2));
    const angle = Math.atan2(after.y - before.y, after.x - before.x);
    const extension = distance - clamped;
    return { x: point.x + Math.cos(angle) * extension, y: point.y + Math.sin(angle) * extension, angle: angle * 180 / Math.PI };
  };
  markers.forEach(marker => {
    const point = pointAt(positions[Number(marker.dataset.trackStop)] * length);
    marker.setAttribute('transform', `translate(${point.x} ${point.y})`);
  });
  const draw = () => {
    const front = pointAt(progress * length);
    landscape.setAttribute('viewBox', mobile.matches
      ? `${Math.max(0, Math.min(500, front.x - 350))} 0 600 380`
      : '0 0 1100 380');
    cars.forEach(car => {
      const point = pointAt(progress * length - Number(car.dataset.trainCar) * 92);
      car.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${point.angle})`);
    });
    const active = positions.findIndex(position => progress >= position - .025 && progress <= position + .15);
    if (mobile.matches && !preference.matches && performance.now() > manualScrollUntil) {
      // Match the label strip's position to the moving landscape continuously.
      const coordinate = Math.max(0, Math.min(1, (progress - positions[0]) / (positions.at(-1) - positions[0])));
      const first = stops[0].offsetLeft + stops[0].offsetWidth / 2;
      const last = stops.at(-1).offsetLeft + stops.at(-1).offsetWidth / 2;
      stopViewport.scrollLeft = first + (last - first) * coordinate - stopViewport.clientWidth / 2;
    }
    if (active === currentStop) return;
    currentStop = active;
    stops.forEach((stop, index) => {
      stop.classList.toggle('is-current', index === active);
      markers[index]?.classList.toggle('is-current', index === active);
    });
  };
  const running = () => visible && !document.hidden && !preference.matches;
  const animate = time => {
    frame = null;
    if (!running()) { previousTime = null; return; }
    const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, .1);
    previousTime = time;
    progress += delta * .06;
    if (progress > end) progress = start + (progress - end);
    draw();
    frame = requestAnimationFrame(animate);
  };
  const sync = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
    if (running()) frame = requestAnimationFrame(animate);
  };
  const onPreferenceChange = () => {
    if (preference.matches) {
      progress = positions[0];
      draw();
    }
    sync();
  };
  if (preference.addEventListener) preference.addEventListener('change', onPreferenceChange);
  else preference.addListener(onPreferenceChange);
  document.addEventListener('visibilitychange', sync);
  if (mobile.addEventListener) mobile.addEventListener('change', draw);
  else mobile.addListener(draw);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 });
    observer.observe(journey);
  }
  draw();
  sync();
})();
