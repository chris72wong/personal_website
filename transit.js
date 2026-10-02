(() => {
  const journey = document.querySelector('.transit-journey');
  if (!journey) return;
  const track = journey.querySelector('#transit-track');
  const cars = Array.from(journey.querySelectorAll('.transit-train'));
  const stops = Array.from(journey.querySelectorAll('[data-transit-stop]'));
  const landscape = journey.querySelector('.transit-landscape');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!track?.getPointAtLength || !cars.length || !stops.length) return;

  const length = track.getTotalLength();
  const positions = stops.map(stop => Number(stop.dataset.progress));
  const start = -.02;
  const end = 1 + 480 / length;
  const initialProgress = () => .8;
  const scale = 480 / 1100;
  const carEnds = [1100, 675, 360];
  let progress = initialProgress();
  let visible = !('IntersectionObserver' in window);
  let frame = null;
  let previousTime = null;
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
    const next = positions.findIndex(position => progress < position);
    const last = stops.length - 1;
    const route = next < 0 ? last : next === 0 ? 0 : next - 1 +
      (progress - positions[next - 1]) / (positions[next] - positions[next - 1]);
    stops.forEach((stop, index) => {
      stop.classList.toggle('is-current', index === active);
      stop.classList.toggle('is-passed', progress >= positions[index] - .025);
      // Each stop owns half of the connectors on either side of its icon.
      const left = index === 0 ? 0 : index - .5;
      const right = index === last ? last : index + .5;
      const fill = Math.max(0, Math.min(1, (route - left) / (right - left)));
      stop.style.setProperty('--connector-fill', fill.toFixed(4));
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
