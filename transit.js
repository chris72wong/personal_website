(() => {
  const journey = document.querySelector('.transit-journey');
  if (!journey) return;
  const track = journey.querySelector('#transit-track');
  const cars = Array.from(journey.querySelectorAll('.transit-train'));
  const stops = Array.from(journey.querySelectorAll('[data-transit-stop]'));
  const landscape = journey.querySelector('.transit-landscape');
  const connectors = journey.querySelector('.transit-stops');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!track?.getPointAtLength || !cars.length || !stops.length) return;

  const length = track.getTotalLength();
  const positions = stops.map(stop => Number(stop.dataset.progress));
  const start = -.02;
  const end = 1 + 480 / length;
  const finishHold = .5;
  const finishFade = 1.4;
  const finishPause = .4;
  const initialProgress = () => .8;
  const scale = 480 / 1100;
  const carEnds = [1100, 675, 360];
  const carGeometry = cars.map(car => {
    const art = car.querySelector('.train-car-art');
    const [ax, ay] = art.dataset.bogieRear.split(',').map(Number);
    const [bx, by] = art.dataset.bogieFront.split(',').map(Number);
    const ux = bx - ax, uy = by - ay;
    return { car, art, beam: car.querySelector('.train-headlight'), ax, ay, bx,
      ux, uy, denominator: ux * ux + uy * uy, end: carEnds[Number(car.dataset.trainCar)] };
  });
  let progress = initialProgress();
  let finishTime = 0;
  let visible = !('IntersectionObserver' in window);
  let frame = null;
  let previousTime = null;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smoothstep = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  // Extend the tangents so the complete three-car train enters and leaves fully.
  const pointAt = distance => {
    const clamped = Math.max(0, Math.min(length, distance));
    const point = track.getPointAtLength(clamped);
    if (distance === clamped) return point;
    const before = track.getPointAtLength(Math.max(0, clamped - 2));
    const after = track.getPointAtLength(Math.min(length, clamped + 2));
    const angle = Math.atan2(after.y - before.y, after.x - before.x);
    const extension = distance - clamped;
    return { x: point.x + Math.cos(angle) * extension, y: point.y + Math.sin(angle) * extension };
  };
  const draw = () => {
    carGeometry.forEach(({ car, art, beam, ax, ay, bx, ux, uy, denominator, end }) => {
      const rear = pointAt(progress * length - (1100 - ax) * scale);
      const ahead = pointAt(progress * length - (1100 - bx) * scale);
      const origin = pointAt(progress * length - (1100 - end) * scale);
      // Map the two bogie contact points onto the track. Each carriage follows
      // its own chord instead of swinging the entire train from its front tip.
      const vx = ahead.x - rear.x, vy = ahead.y - rear.y;
      const a = (vx * ux + vy * uy) / denominator;
      const b = (vy * ux - vx * uy) / denominator;
      const e = rear.x - origin.x - a * ax + b * ay;
      const f = rear.y - origin.y - b * ax - a * ay;
      car.setAttribute('transform', `translate(${origin.x} ${origin.y})`);
      art.setAttribute('transform', `matrix(${a} ${b} ${-b} ${a} ${e} ${f})`);
      beam?.setAttribute('transform', `rotate(${Math.atan2(vy, vx) * 180 / Math.PI})`);
    });
    const glow = 1 - smoothstep((finishTime - finishHold) / finishFade);
    journey.style.setProperty('--journey-glow', glow.toFixed(4));
    const next = positions.findIndex(position => progress < position);
    const last = stops.length - 1;
    const route = next < 0 ? last : next === 0 ? 0 : next - 1 +
      (progress - positions[next - 1]) / (positions[next] - positions[next - 1]);
    // One reveal spans the entire route, so it cannot split at column edges.
    connectors.style.setProperty('--connector-progress', `${(clamp(route / last) * 100).toFixed(4)}%`);
    stops.forEach((stop, index) => {
      const arrival = smoothstep((progress - positions[index] + .025) / .05);
      const departure = index === last ? 0 : smoothstep((progress - positions[index] - .10) / .08);
      stop.classList.toggle('is-current', progress >= positions[index] - .025 && (index === last || progress < positions[index] + .18));
      stop.classList.toggle('is-passed', progress >= positions[index] - .025);
      stop.style.setProperty('--stop-glow', arrival.toFixed(4));
      stop.style.setProperty('--stop-current-glow', (arrival * (1 - departure)).toFixed(4));
    });
  };
  const running = () => visible && !document.hidden && !preference.matches && !document.body.classList.contains('project-open');
  const animate = time => {
    frame = null;
    if (!running()) { previousTime = null; return; }
    const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, .1);
    previousTime = time;
    if (progress < end) {
      const advanced = progress + delta * .06;
      progress = Math.min(end, advanced);
      finishTime = Math.max(0, (advanced - end) / .06);
    } else {
      // Hold the completed route, then fade every light together. Reset only
      // while the glow is dark and the entire train is outside the scene.
      finishTime += delta;
      if (finishTime >= finishHold + finishFade + finishPause) {
        progress = start + (finishTime - finishHold - finishFade - finishPause) * .06;
        finishTime = 0;
      }
    }
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
      finishTime = 0;
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
