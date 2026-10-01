(() => {
  const stage = document.querySelector('.city-stage');
  const road = stage?.querySelector('.city-road');
  const traffic = stage?.querySelector('.city-traffic');
  const path = traffic?.querySelector('.city-drive-path');
  const car = traffic?.querySelector('.city-car');
  const buildings = Array.from(stage?.querySelectorAll('.project-building') || []);
  if (!path?.getPointAtLength || !buildings.length) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 640px)');
  let visible = !('IntersectionObserver' in window);
  let frame = null;
  let previous = null;
  let distance = 0;
  let length = 0;
  let outboundLength = 0;
  let stopPoints = [];

  const layout = () => {
    const bounds = stage.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    const boxes = buildings.map(building => {
      const box = building.getBoundingClientRect();
      return { top: box.top - bounds.top, bottom: box.bottom - bounds.top, x: box.left - bounds.left + box.width / 2 };
    });
    for (const svg of [road, traffic]) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    let center;
    if (mobile.matches) {
      const right = width - 34;
      const left = 34;
      const firstBend = (boxes[0].bottom + boxes[1].top) / 2;
      const secondBend = (boxes[1].bottom + boxes[2].top) / 2;
      // Each bend fits entirely into the gap after a building and its action.
      center = `M${right} -32V${firstBend - 38}C${right} ${firstBend + 2} ${left} ${firstBend - 2} ${left} ${firstBend + 38}V${secondBend - 38}C${left} ${secondBend + 2} ${right} ${secondBend - 2} ${right} ${secondBend + 38}V${height + 32}`;
      stopPoints = boxes.map((box, index) => ({ x: index === 1 ? left : right, y: (box.top + box.bottom) / 2 }));
    } else {
      const street = stage.querySelector('.city-street').getBoundingClientRect();
      const y = street.top - bounds.top + street.height / 2;
      center = `M-32 ${y}H${width + 32}`;
      stopPoints = boxes.map(box => ({ x: box.x, y }));
    }
    const centerPath = road.querySelector('.city-road-markings');
    road.querySelectorAll('path').forEach(part => part.setAttribute('d', center));
    const centerLength = centerPath.getTotalLength();
    const down = [];
    const up = [];
    const lane = mobile.matches ? 10 : 5;
    for (let offset = 0; offset <= centerLength; offset += 4) {
      const point = centerPath.getPointAtLength(offset);
      const before = centerPath.getPointAtLength(Math.max(0, offset - 1));
      const after = centerPath.getPointAtLength(Math.min(centerLength, offset + 1));
      const angle = Math.atan2(after.y - before.y, after.x - before.x);
      down.push(`${point.x - Math.sin(angle) * lane},${point.y + Math.cos(angle) * lane}`);
      up.push(`${point.x + Math.sin(angle) * lane},${point.y - Math.cos(angle) * lane}`);
    }
    path.setAttribute('d', `M${down.join('L')}`);
    outboundLength = path.getTotalLength();
    path.setAttribute('d', `M${down.join('L')}L${up.reverse().join('L')}Z`);
    const newLength = path.getTotalLength();
    distance = length ? distance / length * newLength : 48;
    length = newLength;
    stage.classList.add('traffic-ready');
    draw();
  };
  const draw = () => {
    const point = path.getPointAtLength(distance);
    const before = path.getPointAtLength(Math.max(0, distance - 1));
    const after = path.getPointAtLength(Math.min(length, distance + 1));
    const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    car.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
    car.dataset.direction = distance < outboundLength ? 'outbound' : 'return';
    buildings.forEach((building, index) => {
      const stop = stopPoints[index];
      building.classList.toggle('is-passing', Math.hypot(point.x - stop.x, point.y - stop.y) < (mobile.matches ? 65 : 95));
    });
  };
  const running = () => visible && !document.hidden && !preference.matches && !document.body.classList.contains('project-open');
  const animate = time => {
    frame = null;
    if (!running()) { previous = null; return; }
    const delta = previous === null ? 0 : Math.min((time - previous) / 1000, .1);
    previous = time;
    distance = (distance + delta * 85) % length;
    draw();
    frame = requestAnimationFrame(animate);
  };
  const sync = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = null;
    if (running()) frame = requestAnimationFrame(animate);
  };
  const listen = (media, handler) => media.addEventListener ? media.addEventListener('change', handler) : media.addListener(handler);
  listen(preference, sync);
  listen(mobile, layout);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(stage);
  }
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage);
  else window.addEventListener('resize', layout);
  layout();
  sync();
})();
