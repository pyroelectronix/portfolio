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

  // Apparel carousel: duplicate the cards for a seamless loop and set a constant speed.
  // CSS pauses it on hover / focus; touch devices pause while a finger is on it.
  const apparel = $("#apparel");
  const aWrap = $("#apparelMarquee");
  const aTrack = $("#aTrack");
  const A_SPEED = 55; // pixels per second, raise for faster scrolling
  if (!canHover) $(".a-hint").textContent = "Touch to pause · tap to view";
  if (!reduced) {
    $$(".a-card", aTrack).forEach((card) => {
      const copy = card.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      copy.tabIndex = -1;
      aTrack.appendChild(copy);
    });
  }
  const setSpeed = () => {
    const half = aTrack.scrollWidth / (reduced ? 1 : 2);
    if (half > 0) aTrack.style.setProperty("--dur", Math.max(20, half / A_SPEED) + "s");
  };
  setSpeed();
  addEventListener("load", setSpeed);
  addEventListener("resize", setSpeed);
  let touchTimer;
  aWrap.addEventListener("touchstart", () => { clearTimeout(touchTimer); aWrap.classList.add("paused"); }, { passive: true });
  const touchEnd = () => { clearTimeout(touchTimer); touchTimer = setTimeout(() => aWrap.classList.remove("paused"), 1800); };
  aWrap.addEventListener("touchend", touchEnd, { passive: true });
  aWrap.addEventListener("touchcancel", touchEnd, { passive: true });

  // Filter
  const tiles = $$(".tile");
  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const f = chip.dataset.filter;
      tiles.forEach((t) => t.classList.toggle("hidden", f !== "all" && t.dataset.cat !== f));
      const showApparel = f === "all" || f === apparel.dataset.cat;
      apparel.classList.toggle("hidden", !showApparel);
      if (showApparel) setSpeed();
    });
  });

  // Lightbox
  const lb = $("#lightbox");
  const lbBody = $("#lbBody");
  const lbCap = $("#lbCap");
  const closeLb = () => {
    lb.classList.remove("show");
    lb.setAttribute("aria-hidden", "true");
    setTimeout(() => lb.classList.remove("open"), 400);
  };
  const openLb = (img, title, bg) => {
    lbBody.style.backgroundImage = img ? `url("${img}")` : "";
    lbBody.style.backgroundColor = bg || "";
    lbCap.textContent = title || "";
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => lb.classList.add("show"));
  };
  tiles.forEach((t) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      openLb(t.dataset.img, t.dataset.title);
    });
  });
  // Apparel cards (event delegation also covers the duplicated cards)
  aTrack.addEventListener("click", (e) => {
    const card = e.target.closest(".a-card");
    if (card) openLb(card.dataset.img, card.dataset.title, card.style.getPropertyValue("--c"));
  });
  $("#lbClose").addEventListener("click", closeLb);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

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
