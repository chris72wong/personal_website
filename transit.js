(() => {
  const journey = document.querySelector('.transit-journey');
  if (!journey) return;
  const track = journey.querySelector('#transit-track');
  const cars = Array.from(journey.querySelectorAll('.transit-train'));
  const stops = Array.from(journey.querySelectorAll('[data-transit-stop]'));
  const landscape = journey.querySelector('.transit-landscape');
  const stopViewport = journey.querySelector('.transit-stops-viewport');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 640px)');
  if (!track?.getPointAtLength || !cars.length || !stops.length) return;

  const length = track.getTotalLength();
  const positions = stops.map(stop => Number(stop.dataset.progress));
  const start = -.02;
  const end = 1 + 480 / length;
  const initialProgress = () => mobile.matches ? .32 : .8;
  const scale = 480 / 1100;
  const carEnds = [1100, 675, 360];
  let progress = initialProgress();
  let visible = !('IntersectionObserver' in window);
  let frame = null;
  let previousTime = null;
  let currentStop = -1;
  let manualScrollUntil = 0;
  // Give touch, trackpad, and keyboard exploration time before following again.
  ['pointerdown', 'wheel', 'keydown'].forEach(event => stopViewport.addEventListener(event, () => {
    manualScrollUntil = performance.now() + 8000;
  }, { passive: true }));

  // Extend the tangents so the complete three-car train enters and leaves fully.
  const pointAt = distance => {
    const clamped = Math.max(0, Math.min(length, distance));
    const point = track.getPointAtLength(clamped);
    const before = track.getPointAtLength(Math.max(0, clamped - 2));
    const after = track.getPointAtLength(Math.min(length, clamped + 2));
    const angle = Math.atan2(after.y - before.y, after.x - before.x);
    const extension = distance - clamped;
    return { x: point.x + Math.cos(angle) * extension, y: point.y + Math.sin(angle) * extension, angle: angle * 180 / Math.PI };
  };
  const draw = () => {
    const front = pointAt(progress * length);
    landscape.setAttribute('viewBox', mobile.matches
      ? `${Math.max(0, Math.min(732, front.x - 640))} 70 940 840`
      : '0 0 1672 941');
    cars.forEach(car => {
      const index = Number(car.dataset.trainCar);
      const art = car.querySelector('.train-car-art');
      const [ax, ay] = art.dataset.bogieRear.split(',').map(Number);
      const [bx, by] = art.dataset.bogieFront.split(',').map(Number);
      const rear = pointAt(progress * length - (1100 - ax) * scale);
      const ahead = pointAt(progress * length - (1100 - bx) * scale);
      const origin = pointAt(progress * length - (1100 - carEnds[index]) * scale);
      // Map the two bogie contact points onto the track. Each carriage follows
      // its own chord instead of swinging the entire train from its front tip.
      const ux = bx - ax, uy = by - ay;
      const vx = ahead.x - rear.x, vy = ahead.y - rear.y;
      const denominator = ux * ux + uy * uy;
      const a = (vx * ux + vy * uy) / denominator;
      const b = (vy * ux - vx * uy) / denominator;
      const e = rear.x - origin.x - a * ax + b * ay;
      const f = rear.y - origin.y - b * ax - a * ay;
      car.setAttribute('transform', `translate(${origin.x} ${origin.y})`);
      art.setAttribute('transform', `matrix(${a} ${b} ${-b} ${a} ${e} ${f})`);
      const beam = car.querySelector('.train-headlight');
      beam?.setAttribute('transform', `rotate(${Math.atan2(vy, vx) * 180 / Math.PI})`);
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
    });
  };
  const running = () => visible && !document.hidden && !preference.matches && !document.body.classList.contains('project-open');
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
      progress = initialProgress();
      draw();
    }
    sync();
  };
  if (preference.addEventListener) preference.addEventListener('change', onPreferenceChange);
  else preference.addListener(onPreferenceChange);
  document.addEventListener('visibilitychange', sync);
  if ('MutationObserver' in window) new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (mobile.addEventListener) mobile.addEventListener('change', draw);
  else mobile.addListener(draw);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 });
    observer.observe(landscape);
  }
  draw();
  sync();
})();
