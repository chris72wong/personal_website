const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../projects.js'), 'utf8');
const ids = ['project-dream-planner', 'project-travel-dashboard', 'project-gym-partner'];
const titles = ['dream-planner-title', 'travel-dashboard-title', 'gym-partner-title'];
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup({ hash = '#projects', reduced = false, observers = true, nativeDialog = true, animationsEnabled = true, restrictedHistory = false, legacyMedia = false } = {}) {
  const animations = [];
  const observersCreated = [];
  const frames = [];
  const flushFrames = () => frames.splice(0).forEach(callback => callback());
  let activeElement;
  class Element {
    constructor(id = '') {
      this.id = id;
      this.hidden = false;
      this.dataset = {};
      this.attributes = {};
      this.events = {};
      this.children = [];
      this.classes = new Set();
      this.classList = {
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
      };
      this.properties = {};
      this.style = {
        setProperty: (name, value) => { this.properties[name] = value; },
        removeProperty: name => { delete this.properties[name]; }
      };
      if (!animationsEnabled) this.animate = undefined;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    addEventListener(name, callback) { (this.events[name] ??= []).push(callback); }
    dispatch(name, event = {}) { (this.events[name] ?? []).forEach(callback => callback(event)); }
    append(child) { this.children.push(child); }
    querySelector() { return null; }
    getBoundingClientRect() { return { left: 120, top: 220, right: 420, bottom: 550, width: 300, height: 330 }; }
    focus(options) { activeElement = this; this.focusOptions = options; }
    animate(frames, options) {
      let complete, fail;
      const finished = new Promise((resolve, reject) => { complete = resolve; fail = reject; });
      finished.catch(() => {});
      const animation = {
        element: this, frames, options, finished, cancelled: false,
        complete() { complete(); },
        cancel() { this.cancelled = true; fail(new Error('Animation cancelled')); }
      };
      animations.push(animation);
      return animation;
    }
  }
  const panels = ids.map((id, index) => {
    const panel = new Element(id);
    panel.setAttribute('aria-labelledby', titles[index]);
    return panel;
  });
  const selectors = ids.map(id => {
    const selector = new Element();
    selector.dataset.projectLink = id;
    return selector;
  });
  const panelContainer = new Element();
  const dialogContent = new Element();
  const closeButton = new Element();
  const body = new Element();
  const stage = new Element();
  const section = new Element('projects');
  const dialog = new Element('project-dialog');
  dialog.open = false;
  dialog.showModal = nativeDialog ? () => { dialog.open = true; } : undefined;
  dialog.close = () => { dialog.open = false; dialog.dispatch('close'); };
  dialog.getBoundingClientRect = () => ({ left: 150, top: 140, right: 1050, bottom: 760, width: 900, height: 620 });
  dialog.querySelector = selector => ({ '.project-dialog-content': dialogContent, '.project-dialog-close': closeButton })[selector];
  section.querySelectorAll = selector => selector === '.project-panel' ? panels : selectors;
  section.querySelector = selector => ({ '.project-dialog': dialog, '.project-panels': panelContainer, '.city-stage': stage })[selector];
  const preference = new Element();
  preference.matches = reduced;
  if (legacyMedia) {
    preference.addListener = callback => Element.prototype.addEventListener.call(preference, 'change', callback);
    preference.addEventListener = undefined;
  }
  const window = new Element();
  window.location = { hash };
  window.scrollX = 0;
  window.scrollY = 740;
  const addBodyClass = body.classList.add;
  body.classList.add = name => {
    addBodyClass(name);
    if (name === 'project-open') window.scrollY = 0;
  };
  window.innerWidth = 1280;
  window.innerHeight = 900;
  window.scrollCalls = [];
  window.scrollTo = options => {
    window.scrollCalls.push(options);
    window.scrollX = options.left;
    window.scrollY = options.top;
  };
  section.scrollIntoView = () => { window.scrollY = 820; };
  window.matchMedia = () => preference;
  const history = [{ hash, state: { external: 'kept' } }];
  let position = 0;
  window.history = {
    pushes: [], savedScrolls: [], backCalls: 0,
    get state() { return history[position].state; },
    pushState(state, _title, nextHash) {
      this.savedScrolls.push(window.scrollY);
      history.splice(++position, history.length, { state, hash: nextHash });
      this.pushes.push(nextHash);
      window.location.hash = nextHash;
    },
    replaceState(state, _title, nextHash) {
      history[position] = { state, hash: nextHash };
      window.location.hash = nextHash;
    },
    back() {
      this.backCalls++;
      if (!position) return;
      window.location.hash = history[--position].hash;
      window.dispatch('popstate');
      window.dispatch('hashchange');
    },
    forward() {
      if (position >= history.length - 1) return;
      window.location.hash = history[++position].hash;
      window.dispatch('popstate');
      window.dispatch('hashchange');
    }
  };
  class Observer {
    constructor(callback) { this.callback = callback; observersCreated.push(this); }
    observe() {}
    visibility(isIntersecting) { this.callback([{ isIntersecting }]); }
  }
  if (restrictedHistory) {
    for (const method of ['pushState', 'replaceState']) window.history[method] = () => { throw new Error('History unavailable'); };
    Object.defineProperty(window.history, 'state', { get() { throw new Error('History unavailable'); } });
  }
  if (observers) window.IntersectionObserver = Observer;
  vm.runInNewContext(source, { document: { getElementById: () => section, body }, window, IntersectionObserver: Observer, requestAnimationFrame: callback => frames.push(callback), setTimeout, clearTimeout });
  const click = (index, extras = {}) => {
    const event = { button: 0, preventDefault() { this.prevented = true; }, ...extras };
    selectors[index].dispatch('click', event);
    return event;
  };
  const selected = () => panels.filter(panel => !panel.hidden).map(panel => panel.id);
  const lastModalAnimation = () => animations.filter(animation => animation.element === dialog).at(-1);
  const completeClose = async () => { lastModalAnimation()?.complete(); await tick(); flushFrames(); };
  return { panels, selectors, panelContainer, dialogContent, dialog, closeButton, body, stage, section, preference, window, animations, observersCreated, selected, click, lastModalAnimation, completeClose, active: () => activeElement };
}

test('the neighbourhood starts with no popup and keeps the articles inside the closed dialog', () => {
  const app = setup();
  assert.equal(app.dialog.open, false);
  assert.deepEqual(app.selected(), []);
  assert.equal(app.dialogContent.children[0], app.panelContainer);
  assert.equal(app.selectors.every(link => link.attributes['aria-expanded'] === 'false'), true);
  assert.equal(app.body.classes.has('project-open'), false);
});

test('entering a place opens the matching modal, moves focus, and preserves existing history state', () => {
  const app = setup();
  assert.equal(app.click(1).prevented, true);
  assert.equal(app.dialog.open, true);
  assert.deepEqual(app.selected(), [ids[1]]);
  assert.equal(app.dialog.attributes['aria-labelledby'], titles[1]);
  assert.equal(app.active(), app.closeButton);
  assert.equal(app.closeButton.focusOptions.preventScroll, true);
  assert.equal(app.body.properties['--project-scroll-top'], '-740px');
  assert.equal(app.window.history.state.external, 'kept');
  assert.deepEqual(app.window.history.pushes, [`#${ids[1]}`]);
  assert.deepEqual(app.window.history.savedScrolls, [740]);
  assert.equal(app.selectors.filter(link => link.attributes['aria-expanded'] === 'true').length, 1);
  assert.equal(app.lastModalAnimation().options.duration, 460);
  app.click(1);
  assert.equal(app.window.history.pushes.length, 1);
});

test('closing reverses the animation, restores scroll and focus, and returns to the previous URL', async () => {
  const app = setup();
  app.click(2);
  const opening = app.lastModalAnimation();
  app.closeButton.dispatch('click');
  assert.equal(opening.cancelled, true);
  assert.equal(app.dialog.open, true);
  assert.equal(app.lastModalAnimation().options.duration, 240);
  await app.completeClose();
  assert.equal(app.dialog.open, false);
  assert.deepEqual(app.selected(), []);
  assert.equal(app.active(), app.selectors[2]);
  assert.equal(app.selectors[2].focusOptions.preventScroll, true);
  assert.equal(app.window.scrollCalls[0].top, 740);
  assert.equal(app.body.classes.has('project-open'), false);
  assert.equal(app.window.location.hash, '#projects');
  assert.equal(app.window.history.backCalls, 1);
});

test('Escape and a genuine backdrop click close; dragging from content to the backdrop does not', async () => {
  const app = setup();
  app.click(0);
  app.dialog.dispatch('pointerdown', { target: app.dialogContent, clientX: 300, clientY: 300 });
  app.dialog.dispatch('click', { target: app.dialog, clientX: 0, clientY: 0 });
  assert.equal(app.lastModalAnimation().options.duration, 460);
  app.dialog.dispatch('pointerdown', { target: app.dialog, clientX: 0, clientY: 0 });
  app.dialog.dispatch('click', { target: app.dialog, clientX: 0, clientY: 0 });
  await app.completeClose();
  assert.equal(app.dialog.open, false);
  app.click(1);
  const event = { preventDefault() { this.prevented = true; } };
  app.dialog.dispatch('cancel', event);
  assert.equal(event.prevented, true);
  await app.completeClose();
  assert.equal(app.dialog.open, false);
});

test('returning from a popup corrects the browser fragment scroll after history has settled', async () => {
  const app = setup();
  const nativeBack = app.window.history.back.bind(app.window.history);
  app.window.history.back = () => { nativeBack(); app.window.scrollY = 40; };
  app.click(0);
  app.closeButton.dispatch('click');
  await app.completeClose();
  assert.equal(app.window.scrollY, 740);
  assert.equal(app.window.scrollCalls.at(-1).top, 740);
});

test('Back closes the modal and Forward reopens the correct project', async () => {
  const app = setup();
  app.click(1);
  app.window.history.back();
  await app.completeClose();
  assert.equal(app.dialog.open, false);
  app.window.history.forward();
  assert.equal(app.dialog.open, true);
  assert.deepEqual(app.selected(), [ids[1]]);
});

test('a direct project link opens without animation and closes to the neighbourhood', () => {
  const app = setup({ hash: `#${ids[2]}`, reduced: true });
  assert.equal(app.dialog.open, true);
  assert.deepEqual(app.selected(), [ids[2]]);
  assert.equal(app.animations.length, 0);
  app.closeButton.dispatch('click');
  assert.equal(app.dialog.open, false);
  assert.equal(app.window.location.hash, '#projects');
  assert.equal(app.window.history.backCalls, 0);
  assert.equal(app.window.scrollCalls[0].top, 820);
});

test('a navigation arriving during a close cancels the stale close without hiding the new project', async () => {
  const app = setup();
  app.click(0);
  app.closeButton.dispatch('click');
  const closing = app.lastModalAnimation();
  app.window.location.hash = `#${ids[2]}`;
  app.window.dispatch('hashchange');
  assert.equal(closing.cancelled, true);
  await tick();
  assert.equal(app.dialog.open, true);
  assert.deepEqual(app.selected(), [ids[2]]);
  assert.equal(app.body.classes.has('project-open'), true);
  app.window.location.hash = '#education';
  app.window.dispatch('hashchange');
  await app.completeClose();
  assert.equal(app.window.location.hash, '#education');
  assert.equal(app.dialog.open, false);
});

test('modified and non-primary clicks retain native links', () => {
  for (const extras of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const app = setup();
    assert.equal(app.click(1, extras).prevented, undefined);
    assert.equal(app.dialog.open, false);
    assert.equal(app.window.history.pushes.length, 0);
  }
});

test('reduced motion skips animations and changing the preference during close finishes cleanup', async () => {
  const staticApp = setup({ reduced: true });
  staticApp.observersCreated[0].visibility(true);
  staticApp.click(2);
  staticApp.closeButton.dispatch('click');
  assert.equal(staticApp.dialog.open, false);
  assert.equal(staticApp.animations.length, 0);
  assert.equal(staticApp.stage.classes.has('city-is-visible'), false);
  const app = setup();
  app.observersCreated[0].visibility(true);
  app.click(1);
  app.closeButton.dispatch('click');
  app.preference.matches = true;
  app.preference.dispatch('change', { matches: true });
  await tick();
  assert.equal(app.dialog.open, false);
  assert.equal(app.body.classes.has('project-open'), false);
  assert.equal(app.animations.every(animation => animation.cancelled), true);
});

test('ambient motion only runs in view, while the entrance runs once', () => {
  const app = setup();
  const observer = app.observersCreated[0];
  observer.visibility(true);
  assert.equal(app.stage.classes.has('city-is-visible'), true);
  observer.visibility(false);
  assert.equal(app.stage.classes.has('city-is-visible'), false);
  observer.visibility(true);
  assert.equal(app.animations.filter(animation => animation.element === app.stage).length, 1);
  assert.equal(setup({ observers: false }).observersCreated.length, 0);
});

test('missing dialog support preserves static articles; missing animation support still opens and closes', () => {
  const fallback = setup({ nativeDialog: false });
  assert.deepEqual(fallback.selected(), ids);
  assert.equal(fallback.section.classes.has('projects-enhanced'), false);
  assert.equal(fallback.selectors[0].attributes['aria-haspopup'], undefined);
  const app = setup({ animationsEnabled: false });
  app.click(0);
  assert.equal(app.dialog.open, true);
  app.closeButton.dispatch('click');
  assert.equal(app.dialog.open, false);
});

test('an unexpected native close also releases the page and restores focus', () => {
  const app = setup();
  app.click(0);
  app.dialog.close();
  assert.equal(app.body.classes.has('project-open'), false);
  assert.equal(app.active(), app.selectors[0]);
});

test('restricted history and legacy media listeners still allow opening and closing every project', () => {
  const app = setup({ restrictedHistory: true, legacyMedia: true, reduced: true });
  for (let index = 0; index < ids.length; index++) {
    app.click(index);
    assert.equal(app.dialog.open, true);
    assert.deepEqual(app.selected(), [ids[index]]);
    app.closeButton.dispatch('click');
    assert.equal(app.dialog.open, false);
    assert.equal(app.body.classes.has('project-open'), false);
  }
});

test('a suspended closing animation cannot leave the page locked', async () => {
  const app = setup();
  app.click(0);
  app.closeButton.dispatch('click');
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(app.dialog.open, false);
  assert.equal(app.body.classes.has('project-open'), false);
  assert.equal(app.window.scrollY, 740);
});

test('static HTML retains complete articles, distinct places, and unique fragment IDs', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const id of ids) {
    const article = html.match(new RegExp(`<article[^>]+id="${id}"[\\s\\S]*?</article>`))[0];
    assert.doesNotMatch(article.split('>')[0], /\bhidden\b/);
    assert.equal((article.match(/<li>/g) ?? []).length >= 3, true);
    assert.match(article, /<img /);
    assert.match(html, new RegExp(`href="#${id}"`));
  }
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(allIds).size, allIds.length);
  assert.match(html, /<dialog class="project-dialog"/);
});
