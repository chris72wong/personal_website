(() => {
  const projectSection = document.getElementById("projects");
  const dialog = projectSection?.querySelector(".project-dialog");
  // The original articles and fragment links remain usable without native dialogs.
  if (!dialog || typeof dialog.showModal !== "function") return;

  const panels = Array.from(projectSection.querySelectorAll(".project-panel"));
  const selectors = Array.from(projectSection.querySelectorAll("[data-project-link]"));
  const panelContainer = projectSection.querySelector(".project-panels");
  const dialogContent = dialog.querySelector(".project-dialog-content");
  const closeButton = dialog.querySelector(".project-dialog-close");
  const visitLink = dialog.querySelector(".project-dialog-visit");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panelsById = new Map(panels.map(panel => [panel.id, panel]));
  const session = `${Date.now()}-${Math.random()}`;
  let selectedId;
  let opener;
  let scrollPosition;
  let modalAnimation;
  let transitionVersion = 0;
  let isClosing = false;
  let backdropPressed = false;
  let pendingReturnPosition;
  const historyState = () => {
    try { return window.history.state; } catch { return null; }
  };
  const writeHistory = (method, state, hash) => {
    // A restricted browser must still be able to open and close project details.
    try { window.history[method](state, "", hash); return true; } catch { return false; }
  };

  const updateSelectors = id => {
    selectors.forEach(selector => {
      const selected = selector.dataset.projectLink === id;
      selector.classList.toggle("is-selected", selected);
      selector.setAttribute("aria-expanded", String(selected));
    });
  };

  const animateDialog = opening => {
    if (preference.matches || typeof dialog.animate !== "function") return;
    const bounds = dialog.getBoundingClientRect();
    const model = opener?.querySelector(".building-model")?.getBoundingClientRect();
    const source = model?.width && model.height ? model : opener?.getBoundingClientRect();
    const visible = source && source.bottom > 0 && source.top < window.innerHeight &&
      source.right > 0 && source.left < window.innerWidth;
    const x = visible ? source.left + source.width / 2 - bounds.left - bounds.width / 2 : 0;
    const y = visible ? source.top + source.height / 2 - bounds.top - bounds.height / 2 : 24;
    const scale = visible ? Math.max(.16, Math.min(.32, source.width / bounds.width)) : .92;
    const from = { opacity: 0, transform: `translate(${x}px, ${y}px) scale(${scale})` };
    const to = { opacity: 1, transform: "translate(0, 0) scale(1)" };
    return dialog.animate(opening ? [from, to] : [to, from], {
      duration: opening ? 460 : 240,
      easing: opening ? "cubic-bezier(.22, 1, .36, 1)" : "cubic-bezier(.4, 0, .8, .4)",
      fill: "both"
    });
  };

  const restorePage = () => {
    document.body.classList.remove("project-open");
    document.body.style.removeProperty("--project-scroll-top");
    if (scrollPosition) {
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: "instant" });
      scrollPosition = undefined;
    }
  };

  const finishClose = ({ updateLocation = true, restoreFocus = true } = {}) => {
    const closedId = selectedId;
    const returnTarget = opener;
    const returnPosition = scrollPosition;
    modalAnimation?.cancel();
    modalAnimation = undefined;
    selectedId = undefined;
    isClosing = false;
    dialog.classList.remove("is-closing");
    if (dialog.open) dialog.close();
    panels.forEach(panel => { panel.hidden = true; });
    updateSelectors();
    restorePage();
    if (restoreFocus) returnTarget?.focus({ preventScroll: true });
    opener = undefined;

    if (updateLocation && window.location.hash === `#${closedId}`) {
      const entry = historyState()?.neighbourhoodProject;
      if (entry?.session === session && entry.id === closedId) {
        pendingReturnPosition = { ...returnPosition, hash: entry.returnHash, version: transitionVersion };
        try { window.history.back(); } catch {
          pendingReturnPosition = undefined;
          writeHistory("replaceState", historyState(), "#projects");
        }
      } else {
        writeHistory("replaceState", historyState(), "#projects");
      }
    }
  };

  const closeProject = async ({ updateLocation = true, animate = true, restoreFocus = true } = {}) => {
    if (!dialog.open || isClosing) return;
    const version = ++transitionVersion;
    isClosing = true;
    modalAnimation?.cancel();
    dialog.classList.add("is-closing");
    modalAnimation = animate ? animateDialog(false) : undefined;
    // Cancellation (including switching to reduced motion) also finishes the close.
    if (modalAnimation) {
      // Mobile browsers can suspend animation completion while switching tabs.
      let timeout;
      try {
        await Promise.race([
          modalAnimation.finished.catch(() => {}),
          new Promise(resolve => { timeout = setTimeout(resolve, 500); })
        ]);
      } finally { clearTimeout(timeout); }
    }
    if (version === transitionVersion) finishClose({ updateLocation, restoreFocus });
  };

  const openProject = (id, { trigger, animate = true } = {}) => {
    const panel = panelsById.get(id);
    if (!panel || (selectedId === id && dialog.open && !isClosing)) return;
    ++transitionVersion;
    modalAnimation?.cancel();
    isClosing = false;
    dialog.classList.remove("is-closing");
    opener = trigger || selectors.find(selector => selector.dataset.projectLink === id);

    if (!dialog.open) {
      // Shared links land at the neighbourhood before entering the project.
      if (!trigger) projectSection.scrollIntoView({ block: "start", behavior: "instant" });
      scrollPosition = { x: window.scrollX, y: window.scrollY };
      document.body.style.setProperty("--project-scroll-top", `-${scrollPosition.y}px`);
      document.body.classList.add("project-open");
    }
    selectedId = id;
    panels.forEach(candidate => { candidate.hidden = candidate !== panel; });
    updateSelectors(id);
    dialog.dataset.project = id;
    visitLink.href = panel.dataset.projectUrl;
    dialog.setAttribute("aria-labelledby", panel.getAttribute("aria-labelledby"));
    if (!dialog.open) dialog.showModal();
    dialogContent.scrollTop = 0;
    closeButton.focus({ preventScroll: true });
    modalAnimation = animate ? animateDialog(true) : undefined;
    const animation = modalAnimation;
    animation?.finished.then(() => {
      if (modalAnimation !== animation || isClosing) return;
      animation.cancel();
      modalAnimation = undefined;
    }, () => {});
  };

  dialogContent.append(panelContainer);
  panels.forEach(panel => { panel.hidden = true; });
  projectSection.classList.add("projects-enhanced");
  selectors.forEach(selector => {
    selector.setAttribute("aria-haspopup", "dialog");
    selector.setAttribute("aria-controls", dialog.id);
    selector.setAttribute("aria-expanded", "false");
    selector.addEventListener("click", event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const id = selector.dataset.projectLink;
      // Save the current history scroll position before fixing the page in place.
      if (window.location.hash !== `#${id}`) {
        writeHistory("pushState", { ...historyState(), neighbourhoodProject: { id, session, returnHash: window.location.hash } }, `#${id}`);
      }
      openProject(id, { trigger: selector });
    });
  });

  closeButton.addEventListener("click", () => closeProject());
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeProject();
  });
  const outsideDialog = event => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener("pointerdown", event => {
    backdropPressed = event.target === dialog && outsideDialog(event);
  });
  dialog.addEventListener("click", event => {
    if (backdropPressed && event.target === dialog && outsideDialog(event)) closeProject();
    backdropPressed = false;
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open && selectedId) {
      ++transitionVersion;
      finishClose();
    }
  });

  const syncLocation = () => {
    if (pendingReturnPosition) {
      const position = pendingReturnPosition;
      pendingReturnPosition = undefined;
      // The browser restores fragment scroll after popstate; finish our return after that.
      requestAnimationFrame(() => {
        if (dialog.open || transitionVersion !== position.version || window.location.hash !== position.hash) return;
        window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
      });
    }
    const id = window.location.hash.slice(1);
    if (panelsById.has(id)) openProject(id);
    else if (dialog.open) closeProject({ updateLocation: false });
  };
  window.addEventListener("hashchange", syncLocation);
  window.addEventListener("popstate", syncLocation);
  if (panelsById.has(window.location.hash.slice(1))) {
    openProject(window.location.hash.slice(1), { animate: false });
  }

  const onPreferenceChange = event => {
    if (!event.matches) return;
    modalAnimation?.cancel();
  };
  if (preference.addEventListener) preference.addEventListener("change", onPreferenceChange);
  else preference.addListener(onPreferenceChange);
})();
