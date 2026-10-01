(() => {
  const projectSection = document.getElementById("projects");
  const panels = Array.from(projectSection.querySelectorAll(".project-panel"));
  const selectors = Array.from(projectSection.querySelectorAll("[data-project-link]"));
  const panelContainer = projectSection.querySelector(".project-panels");
  const stage = projectSection.querySelector(".city-stage");
  const status = projectSection.querySelector(".project-selection-status");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panelsById = new Map(panels.map(panel => [panel.id, panel]));
  let selectedId;
  let panelAnimation;
  let entranceAnimation;
  let entranceObserver;
  let measureFrame;

  const selectProject = (id, { animate = true, announce = true } = {}) => {
    if (!panelsById.has(id) || selectedId === id) return;
    panelAnimation?.cancel();
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
    selectors.forEach(selector => {
      const selected = selector.dataset.projectLink === id;
      selector.classList.toggle("is-selected", selected);
      if (selected) selector.setAttribute("aria-current", "true");
      else selector.removeAttribute("aria-current");
    });
    selectedId = id;
    const panel = panelsById.get(id);
    if (animate && !preference.matches && typeof panel.animate === "function") {
      panelAnimation = panel.animate([{ opacity: .4 }, { opacity: 1 }], {
        duration: 180, easing: "ease-out"
      });
    }
    if (announce) status.textContent = `${panel.querySelector("h3").textContent} selected.`;
  };

  // A stable panel height keeps the scene and the reader's scroll position steady.
  const measurePanels = () => {
    cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(() => {
      panelContainer.classList.add("measuring-projects");
      try {
        const height = Math.max(...panels.map(panel => panel.offsetHeight));
        panelContainer.style.minHeight = `${height}px`;
      } finally {
        panelContainer.classList.remove("measuring-projects");
      }
    });
  };

  const selectFromLocation = (animate = true) => {
    const id = window.location.hash.slice(1);
    if (panelsById.has(id)) selectProject(id, { animate, announce: animate });
  };

  projectSection.classList.add("projects-enhanced");
  const initialId = window.location.hash.slice(1);
  selectProject(panelsById.has(initialId) ? initialId : panels[0].id, {
    animate: false, announce: false
  });

  selectors.forEach(selector => {
    selector.addEventListener("click", event => {
      // Retain normal new-tab and modified-link behavior.
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const id = selector.dataset.projectLink;
      selectProject(id);
      if (window.location.hash !== `#${id}`) {
        window.history.pushState(null, "", `#${id}`);
      }
    });
  });
  window.addEventListener("hashchange", () => selectFromLocation());
  window.addEventListener("popstate", () => selectFromLocation());
  window.addEventListener("resize", measurePanels);
  panels.forEach(panel => {
    panel.querySelectorAll("img").forEach(img => img.addEventListener("load", measurePanels));
  });
  document.fonts?.ready.then(measurePanels);
  measurePanels();

  if (!preference.matches && "IntersectionObserver" in window && typeof stage.animate === "function") {
    entranceObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      entranceObserver.disconnect();
      entranceAnimation = stage.animate([
        { opacity: .35, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 480, easing: "ease-out" });
    }, { threshold: .1 });
    entranceObserver.observe(stage);
  }

  preference.addEventListener("change", event => {
    if (!event.matches) return;
    panelAnimation?.cancel();
    entranceAnimation?.cancel();
    entranceObserver?.disconnect();
  });
})();
