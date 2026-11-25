(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover)").matches;

  // Year
  $("#year").textContent = $("#year2").textContent = new Date().getFullYear();

  // Split headings into letters for the slide-up animation.
  // Letters are grouped into words (no-wrap) with real spaces between them,
  // so text wraps only between words at any screen size or zoom level.
  $$("[data-split]").forEach((el) => {
    const nodes = [...el.childNodes];
    el.setAttribute("aria-label", nodes.map((n) => n.textContent).join(""));
    el.textContent = "";
    let i = 0;
    nodes.forEach((node) => {
      const isEm = node.nodeType === 1 && node.tagName === "EM";
      const wrap = isEm ? document.createElement("em") : el;
      let word = null;
      [...node.textContent].forEach((c) => {
        if (c === " ") {
          word = null;
          wrap.appendChild(document.createTextNode(" "));
          return;
        }
        if (!word) {
          word = document.createElement("span");
          word.className = "word";
          word.setAttribute("aria-hidden", "true");
          wrap.appendChild(word);
        }
        const s = document.createElement("span");
        s.className = "ch";
        s.style.setProperty("--i", i++);
        s.textContent = c;
        word.appendChild(s);
      });
      if (isEm) el.appendChild(wrap);
    });
  });

  // Loader, then start the cover animation
  const start = () => {
    $("#loader").classList.add("done");
    document.body.classList.add("ready");
  };
  window.addEventListener("load", () => setTimeout(start, reduced ? 0 : 650));

  // Scroll progress + nav hide on scroll down
  const nav = $("#topnav");
  const bar = $("#progress");
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    nav.classList.toggle("hide", y > lastY && y > 300);
    lastY = y;
  }, { passive: true });

  // Reveal on scroll (also timeline and non-hero split headings)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.1 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 3) * 90 + "ms";
    io.observe(el);
  });
  $$(".split").forEach((el) => { if (!el.closest(".cover")) io.observe(el); });
  io.observe($("#timeline"));

  // Back to top
  $("#toTop").addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));

  // Project images from data-img
  $$(".tile").forEach((t) => {
    if (t.dataset.img) t.style.backgroundImage = `url("${t.dataset.img}")`;
  });

  // Apparel carousel: cards sit on a 3D ring that rotates continuously.
  // It eases to a stop while the pointer is over it (or it is focused, touched or dragged)
  // and picks up again when the pointer leaves.
  const apparel = $("#apparel");
  const aWrap = $("#apparelMarquee");
  const aTrack = $("#aTrack");
  const aCards = $$(".a-card", aTrack);
  const A_SPEED = 4; // degrees per second, raise for faster rotation (360 = one full turn)
  const A_N = aCards.length;
  const A_STEP = 360 / A_N;
  let aAngle = 0, aR = 0, aVel = 0, aHold = false, aDrag = false, dragMoved = false, aTween = null, aInView = false, aLast = performance.now();
  if (!canHover) $(".a-hint").textContent = "Drag to spin · tap to view";

  const aRender = () => {
    aTrack.style.transform = `translateZ(${-aR}px) rotateY(${aAngle}deg)`;
    aCards.forEach((card, i) => {
      const a = ((((i * A_STEP + aAngle) % 360) + 540) % 360) - 180; // -180..180, 0 = facing front
      card.style.setProperty("--dim", ((1 - Math.cos((a * Math.PI) / 180)) * 0.38).toFixed(3));
    });
  };
  const aLayout = () => {
    const cw = aTrack.offsetWidth;
    if (!cw) return; // hidden
    aR = Math.round((cw / 2 / Math.tan(Math.PI / A_N)) * 1.12);
    aCards.forEach((card, i) => (card.style.transform = `rotateY(${i * A_STEP}deg) translateZ(${aR}px)`));
    aRender();
  };
  const aTick = (now) => {
    const dt = Math.min((now - aLast) / 1000, 0.05);
    aLast = now;
    if (aInView && aR && !apparel.classList.contains("hidden")) {
      if (aTween !== null) {
        const d = aTween - aAngle;
        aAngle += d * Math.min(1, dt * 7);
        if (Math.abs(d) < 0.05) { aAngle = aTween; aTween = null; }
        aRender();
      } else if (!aDrag) {
        const target = aHold || reduced ? 0 : -A_SPEED;
        aVel += (target - aVel) * Math.min(1, dt * 6); // ease in / out
        if (Math.abs(aVel) > 0.001) { aAngle += aVel * dt; aRender(); }
      }
    }
    requestAnimationFrame(aTick);
  };
  new IntersectionObserver((en) => { aInView = en[0].isIntersecting; }).observe(aWrap);
  addEventListener("resize", aLayout);
  addEventListener("load", aLayout);
  requestAnimationFrame(aTick);

  // pause while pointing at / focusing / touching the designs
  aWrap.addEventListener("mouseenter", () => (aHold = true));
  aWrap.addEventListener("mouseleave", () => (aHold = false));
  aWrap.addEventListener("focusin", () => (aHold = true));
  aWrap.addEventListener("focusout", () => (aHold = false));
  let aTouchTimer;
  aWrap.addEventListener("touchstart", () => { clearTimeout(aTouchTimer); aHold = true; }, { passive: true });
  const aTouchEnd = () => { clearTimeout(aTouchTimer); aTouchTimer = setTimeout(() => (aHold = false), 1800); };
  aWrap.addEventListener("touchend", aTouchEnd, { passive: true });
  aWrap.addEventListener("touchcancel", aTouchEnd, { passive: true });

  // drag (mouse or finger) to spin the ring
  let aStartX = 0, aStartAngle = 0;
  aWrap.addEventListener("pointerdown", (e) => {
    aDrag = true; dragMoved = false; aTween = null;
    aStartX = e.clientX; aStartAngle = aAngle;
  });
  addEventListener("pointermove", (e) => {
    if (!aDrag) return;
    const dx = e.clientX - aStartX;
    if (Math.abs(dx) > 6) dragMoved = true;
    if (dragMoved) { aAngle = aStartAngle + dx * 0.3; aRender(); }
  });
  const aEndDrag = () => { if (aDrag) { aDrag = false; aVel = 0; setTimeout(() => (dragMoved = false), 0); } };
  addEventListener("pointerup", aEndDrag);
  addEventListener("pointercancel", aEndDrag);

  // previous / next buttons
  const aGo = (dir) => {
    const base = aTween !== null ? aTween : aAngle;
    aTween = Math.round(base / A_STEP) * A_STEP + dir * A_STEP;
  };
  $("#aPrev").addEventListener("click", () => aGo(1));
  $("#aNext").addEventListener("click", () => aGo(-1));

  // Selected work: nothing is shown until a category tab is clicked
  const tiles = $$(".tile");
  const chips = $$(".chip");
  const workEmpty = $("#workEmpty");
  const showCategory = (f) => {
    chips.forEach((c) => c.classList.toggle("active", c.dataset.filter === f));
    tiles.forEach((t) => t.classList.toggle("hidden", t.dataset.cat !== f));
    const showApparel = f === apparel.dataset.cat;
    apparel.classList.toggle("hidden", !showApparel);
    workEmpty.classList.toggle("hidden", !!f);
    if (showApparel) aLayout();
  };
  showCategory(null);
  chips.forEach((chip) => chip.addEventListener("click", () => showCategory(chip.dataset.filter)));

  // Lightbox with previous / next arrows (also the keyboard arrow keys and swiping on touch screens)
  const lb = $("#lightbox");
  const lbBody = $("#lbBody");
  const lbCap = $("#lbCap");
  const lbCount = $("#lbCount");
  let lbItems = [];
  let lbIndex = 0;
  const toItem = (el) => ({ img: el.dataset.img, title: el.dataset.title, bg: el.style.getPropertyValue("--c") });
  const lbShow = (i, dir = 0) => {
    const n = lbItems.length;
    lbIndex = (i + n) % n;
    const it = lbItems[lbIndex];
    lbBody.style.backgroundImage = it.img ? `url("${it.img}")` : "";
    lbBody.style.backgroundColor = it.bg || "";
    lbCap.textContent = it.title || "";
    lbCount.textContent = n > 1 ? `${lbIndex + 1} / ${n}` : "";
    lb.classList.toggle("single", n < 2);
    if (dir && !reduced) {
      lbBody.animate(
        [{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: "none" }],
        { duration: 350, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }
    // preload the neighbours so the next picture appears instantly
    [lbIndex + 1, lbIndex - 1].forEach((k) => {
      const nb = lbItems[(k + n) % n];
      if (nb && nb.img) new Image().src = nb.img;
    });
  };
  const lbStep = (d) => { if (lbItems.length > 1) lbShow(lbIndex + d, d); };
  const openLb = (items, index) => {
    lbItems = items;
    lbShow(index);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => lb.classList.add("show"));
  };
  const closeLb = () => {
    lb.classList.remove("show");
    lb.setAttribute("aria-hidden", "true");
    setTimeout(() => lb.classList.remove("open"), 400);
  };
  // work tiles: browse the tiles of the open category
  tiles.forEach((t) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      const list = tiles.filter((x) => !x.classList.contains("hidden"));
      openLb(list.map(toItem), list.indexOf(t));
    });
  });
  // apparel cards: browse all apparel designs
  aTrack.addEventListener("click", (e) => {
    const card = e.target.closest(".a-card");
    if (card && !dragMoved) openLb(aCards.map(toItem), aCards.indexOf(card));
  });
  $("#lbClose").addEventListener("click", closeLb);
  $("#lbPrev").addEventListener("click", () => lbStep(-1));
  $("#lbNext").addEventListener("click", () => lbStep(1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLb();
    else if (lb.classList.contains("open")) {
      if (e.key === "ArrowRight") lbStep(1);
      else if (e.key === "ArrowLeft") lbStep(-1);
    }
  });
  let lbTouchX = null;
  lb.addEventListener("touchstart", (e) => { lbTouchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (lbTouchX === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchX;
    lbTouchX = null;
    if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
  }, { passive: true });

  if (!canHover || reduced) return;

  // Card spotlight follows the cursor
  $$(".card").forEach((c) => {
    c.addEventListener("mousemove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  // Magnetic pills and links
  $$(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.2;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  });

  // Photo tilt
  const photo = $("#photo");
  photo.addEventListener("mousemove", (e) => {
    const r = photo.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    photo.style.transform = `perspective(700px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
  });
  photo.addEventListener("mouseleave", () => (photo.style.transform = ""));
})();
