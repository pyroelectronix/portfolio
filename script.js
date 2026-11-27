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
  $$(".timeline").forEach((t) => io.observe(t));

  // Back to top
  $("#toTop").addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));

  // Project images from data-img
  $$(".tile").forEach((t) => {
    if (t.dataset.img) t.style.backgroundImage = `url("${t.dataset.img}")`;
  });

  // 3D ring carousel (used by Apparel Design and Certificates).
  // Cards sit on a ring that rotates continuously. It eases to a stop while the pointer is over it
  // (or it is focused, touched or dragged) and picks up again when the pointer leaves.
  const A_SPEED = 4; // degrees per second, raise for faster rotation (360 = one full turn)
  const makeRing = (section, onOpen) => {
    const wrap = $(".a-marquee", section);
    const track = $(".a-track", section);
    const cards = $$(".a-card", track);
    const N = cards.length;
    const STEP = 360 / N;
    let angle = 0, R = 0, vel = 0, hold = false, drag = false, moved = false, tween = null, inView = false, last = performance.now();
    // Load the card pictures straight away (lazy loading is unreliable inside a rotating 3D ring)
    // and retry a picture that failed once, for example while a fresh deploy is still settling.
    $$("img", track).forEach((img) => {
      img.loading = "eager";
      const base = img.getAttribute("src");
      let tries = 0;
      const retry = () => {
        if (tries >= 3) return;
        tries++;
        setTimeout(() => { img.src = `${base}?r=${Date.now()}`; }, 600 * tries);
      };
      img.addEventListener("error", retry);
      if (img.complete && !img.naturalWidth && tries === 0 && img.getAttribute("src")) retry();
    });
    // blurred copy of each picture behind it (used by the Certificates / Graphic Design cards)
    cards.forEach((card) => card.style.setProperty("--bg", `url("${card.dataset.img}")`));
    const hint = $(".a-hint", section);
    if (!canHover && hint) hint.textContent = "Drag to spin · tap to view";

    const render = () => {
      track.style.transform = `translateZ(${-R}px) rotateY(${angle}deg)`;
      cards.forEach((card, i) => {
        const a = ((((i * STEP + angle) % 360) + 540) % 360) - 180; // -180..180, 0 = facing front
        card.style.setProperty("--dim", ((1 - Math.cos((a * Math.PI) / 180)) * 0.38).toFixed(3));
      });
    };
    const layout = () => {
      const cw = track.offsetWidth;
      if (!cw) return; // hidden
      R = Math.round((cw / 2 / Math.tan(Math.PI / N)) * 1.12);
      cards.forEach((card, i) => (card.style.transform = `rotateY(${i * STEP}deg) translateZ(${R}px)`));
      render();
    };
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (inView && R && !section.classList.contains("hidden")) {
        if (tween !== null) {
          const d = tween - angle;
          angle += d * Math.min(1, dt * 7);
          if (Math.abs(d) < 0.05) { angle = tween; tween = null; }
          render();
        } else if (!drag) {
          const target = hold || reduced ? 0 : -A_SPEED;
          vel += (target - vel) * Math.min(1, dt * 6); // ease in / out
          if (Math.abs(vel) > 0.001) { angle += vel * dt; render(); }
        }
      }
      requestAnimationFrame(tick);
    };
    new IntersectionObserver((en) => { inView = en[0].isIntersecting; }).observe(wrap);
    addEventListener("resize", layout);
    addEventListener("load", layout);
    requestAnimationFrame(tick);

    // pause while pointing at / focusing / touching the cards
    wrap.addEventListener("mouseenter", () => (hold = true));
    wrap.addEventListener("mouseleave", () => (hold = false));
    wrap.addEventListener("focusin", () => (hold = true));
    wrap.addEventListener("focusout", () => (hold = false));
    let touchTimer;
    wrap.addEventListener("touchstart", () => { clearTimeout(touchTimer); hold = true; }, { passive: true });
    const touchEnd = () => { clearTimeout(touchTimer); touchTimer = setTimeout(() => (hold = false), 1800); };
    wrap.addEventListener("touchend", touchEnd, { passive: true });
    wrap.addEventListener("touchcancel", touchEnd, { passive: true });

    // drag (mouse or finger) to spin the ring
    let startX = 0, startAngle = 0;
    wrap.addEventListener("pointerdown", (e) => {
      drag = true; moved = false; tween = null;
      startX = e.clientX; startAngle = angle;
    });
    addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      if (moved) { angle = startAngle + dx * 0.3; render(); }
    });
    const endDrag = () => { if (drag) { drag = false; vel = 0; setTimeout(() => (moved = false), 0); } };
    addEventListener("pointerup", endDrag);
    addEventListener("pointercancel", endDrag);

    // previous / next buttons
    const go = (dir) => {
      const base = tween !== null ? tween : angle;
      tween = Math.round(base / STEP) * STEP + dir * STEP;
    };
    const btns = $$(".a-nav .a-btn", section);
    btns[0]?.addEventListener("click", () => go(1));
    btns[1]?.addEventListener("click", () => go(-1));

    // click a card to open it in the viewer (ignored after a drag)
    track.addEventListener("click", (e) => {
      const card = e.target.closest(".a-card");
      if (card && !moved) onOpen(cards, cards.indexOf(card));
    });
    return { section, layout };
  };
  const rings = $$(".apparel").map((sec) => makeRing(sec, (cards, i) => openLb(cards.map(toItem), i)));

  // Selected work: nothing is shown until a category tab is clicked
  const tiles = $$(".tile");
  const chips = $$(".chip");
  const workEmpty = $("#workEmpty");
  const showCategory = (f) => {
    chips.forEach((c) => c.classList.toggle("active", c.dataset.filter === f));
    tiles.forEach((t) => t.classList.toggle("hidden", t.dataset.cat !== f));
    rings.forEach((r) => {
      const show = f === r.section.dataset.cat;
      r.section.classList.toggle("hidden", !show);
      if (show) r.layout();
    });
    workEmpty?.classList.toggle("hidden", !!f);
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
    if (lbCount) lbCount.textContent = n > 1 ? `${lbIndex + 1} / ${n}` + (canHover ? "  ·  use ← → keys to navigate" : "") : "";
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
  $("#lbClose")?.addEventListener("click", closeLb);
  $("#lbPrev")?.addEventListener("click", () => lbStep(-1));
  $("#lbNext")?.addEventListener("click", () => lbStep(1));
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
