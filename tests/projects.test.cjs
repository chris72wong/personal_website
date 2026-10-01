const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../projects.js'), 'utf8');
const ids = ['project-dream-planner', 'project-travel-dashboard', 'project-gym-partner'];
const names = ['Dream Planner', 'Travel Dashboard', 'Gym Partner'];

function setup({ hash = '', reduced = false, observers = true } = {}) {
  const animations = [];
  const observersCreated = [];
  const frameQueue = new Map();
  let frameId = 0;
  class Element {
    constructor(id = '') {
      this.id = id;
      this.hidden = false;
      this.style = {};
      this.attributes = {};
      this.events = {};
      this.classes = new Set();
      this.classList = {
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, callback) { (this.events[name] ??= []).push(callback); }
    dispatch(name, event = {}) { (this.events[name] ?? []).forEach(callback => callback(event)); }
    querySelectorAll() { return []; }
    animate(frames, options) {
      const animation = { element: this, frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      animations.push(animation);
      return animation;
    }
    focus() { throw new Error('Selection must preserve focus'); }
    scrollIntoView() { throw new Error('Selection must not scroll'); }
  }
  const container = new Element();
  const panels = ids.map((id, index) => {
    const panel = new Element(id);
    panel.querySelector = () => ({ textContent: names[index] });
    Object.defineProperty(panel, 'offsetHeight', {
      get: () => panel.hidden && !container.classes.has('measuring-projects') ? 0 : [600, 480, 560][index]
    });
    return panel;
  });
  const selectors = [...ids, ...ids].map(id => Object.assign(new Element(), { dataset: { projectLink: id } }));
  const stage = new Element();
  const status = new Element();
  const section = new Element('projects');
  section.querySelectorAll = selector => selector === '.project-panel' ? panels : selectors;
  section.querySelector = selector => ({ '.project-panels': container, '.city-stage': stage, '.project-selection-status': status })[selector];
  const preference = Object.assign(new Element(), { matches: reduced });
  const window = new Element();
  window.location = { hash };
  window.matchMedia = () => preference;
  window.history = { pushes: [], pushState(_state, _title, nextHash) {
    this.pushes.push(nextHash);
    window.location.hash = nextHash;
  } };
  class Observer {
    constructor(callback) { this.callback = callback; this.connected = true; observersCreated.push(this); }
    observe(element) { this.element = element; }
    disconnect() { this.connected = false; }
    enter() { if (this.connected) this.callback([{ isIntersecting: true }]); }
  }
  if (observers) window.IntersectionObserver = Observer;
  vm.runInNewContext(source, {
    document: { getElementById: () => section }, window, IntersectionObserver: Observer,
    requestAnimationFrame(callback) { const id = ++frameId; frameQueue.set(id, callback); return id; },
    cancelAnimationFrame(id) { frameQueue.delete(id); }
  });
  const flushFrames = () => { [...frameQueue.values()].forEach(callback => callback()); frameQueue.clear(); };
  flushFrames();
  const click = (index, extras = {}) => {
    const event = { button: 0, preventDefault() { this.prevented = true; }, ...extras };
    selectors[index].dispatch('click', event);
    return event;
  };
  const selected = () => panels.filter(panel => !panel.hidden).map(panel => panel.id);
  return { panels, selectors, stage, status, section, container, preference, window, animations, observersCreated, selected, click, flushFrames };
}

test('Dream Planner is immediate, with consistent selected states and a stable detail height', () => {
  const app = setup();
  assert.deepEqual(app.selected(), [ids[0]]);
  assert.equal(app.animations.length, 0);
  assert.equal(app.container.style.minHeight, '600px');
  assert.equal(app.status.textContent, undefined);
  assert.deepEqual(app.selectors.filter(link => link.attributes['aria-current']).map(link => link.dataset.projectLink), [ids[0], ids[0]]);
});

test('a direct project fragment selects its article on initial load', () => {
  assert.deepEqual(setup({ hash: `#${ids[2]}` }).selected(), [ids[2]]);
});

test('native-link enhancement selects and announces without focus or scroll calls', () => {
  const app = setup();
  assert.equal(app.click(1).prevented, true);
  assert.deepEqual(app.selected(), [ids[1]]);
  assert.equal(app.status.textContent, 'Travel Dashboard selected.');
  assert.deepEqual(app.window.history.pushes, [`#${ids[1]}`]);
  assert.equal(app.animations[0].options.duration, 180);
  assert.equal(app.container.style.minHeight, '600px');
  app.click(4);
  assert.equal(app.animations.length, 1);
  assert.equal(app.window.history.pushes.length, 1);
});

test('modified and non-primary clicks retain native link behavior', () => {
  for (const extras of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const app = setup();
    assert.equal(app.click(1, extras).prevented, undefined);
    assert.deepEqual(app.selected(), [ids[0]]);
    assert.equal(app.window.history.pushes.length, 0);
  }
});

test('rapid selection cancels old fades and history events restore the correct panel', () => {
  const app = setup();
  app.click(1);
  app.click(2);
  assert.equal(app.animations[0].cancelled, true);
  assert.deepEqual(app.selected(), [ids[2]]);
  app.window.location.hash = `#${ids[0]}`;
  app.window.dispatch('popstate');
  assert.deepEqual(app.selected(), [ids[0]]);
  app.window.location.hash = `#${ids[1]}`;
  app.window.dispatch('hashchange');
  assert.deepEqual(app.selected(), [ids[1]]);
  app.window.location.hash = '#education';
  app.window.dispatch('hashchange');
  assert.deepEqual(app.selected(), [ids[1]]);
});

test('the entrance plays once, and missing observers leave a static scene', () => {
  const app = setup();
  const observer = app.observersCreated[0];
  observer.enter();
  observer.enter();
  assert.equal(app.animations.filter(animation => animation.element === app.stage).length, 1);
  assert.equal(observer.connected, false);
  assert.equal(setup({ observers: false }).observersCreated.length, 0);
});

test('reduced motion skips animations and a preference change cancels active motion', () => {
  const staticApp = setup({ reduced: true });
  staticApp.click(2);
  assert.deepEqual(staticApp.selected(), [ids[2]]);
  assert.equal(staticApp.animations.length, 0);
  assert.equal(staticApp.observersCreated.length, 0);
  const app = setup();
  app.observersCreated[0].enter();
  app.click(1);
  app.preference.matches = true;
  app.preference.dispatch('change', { matches: true });
  assert.equal(app.animations.every(animation => animation.cancelled), true);
  app.click(2);
  assert.equal(app.animations.length, 2);
  assert.deepEqual(app.selected(), [ids[2]]);
});

test('static HTML keeps three complete, visible articles and native fragment links', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const id of ids) {
    const article = html.match(new RegExp(`<article[^>]+id="${id}"[\\s\\S]*?</article>`))[0];
    assert.doesNotMatch(article.split('>')[0], /\bhidden\b/);
    assert.equal((article.match(/<li>/g) ?? []).length >= 3, true);
    assert.match(article, /<img /);
    assert.match(html, new RegExp(`href="#${id}"`));
  }
});
