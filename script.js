(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;

  // Footer year
  $("#year").textContent = new Date().getFullYear();

  // Loader -> start hero animation
  window.addEventListener("load", () => {
    setTimeout(() => {
      $("#loader").classList.add("done");
      document.body.classList.add("ready");
    }, reduced ? 0 : 700);
  });

  // Theme toggle
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  // Scroll progress, nav hide/show
  const nav = $("#nav");
  const bar = $("#progress");
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (y / max) * 100 + "%";
    nav.classList.toggle("scrolled", y > 40);
    nav.classList.toggle("hide", y > lastY && y > 300);
    lastY = y;
  }, { passive: true });

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 80 + "ms";
    io.observe(el);
  });

  // Count-up stats
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const start = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      reduced ? (el.textContent = target) : requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  // Back to top
  $("#toTop").addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
  );

  if (!canHover || reduced) return;

  // Custom cursor (smoothed)
  const cursor = $("#cursor");
  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    cursor.classList.add("show");
  });
  (function loop() {
    cx += (mx - cx) * 0.2;
    cy += (my - cy) * 0.2;
    cursor.style.left = cx + "px";
    cursor.style.top = cy + "px";
    requestAnimationFrame(loop);
  })();
  $$("a, button, .skills li").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("hover"));
  });

  // Magnetic buttons
  $$(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25;
      const y = (e.clientY - r.top - r.height / 2) * 0.25;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  });

  // Project hover image preview following cursor
  const preview = $("#preview");
  const img = $("img", preview);
  let px = 0, py = 0;
  $$(".project").forEach((p) => {
    p.addEventListener("mouseenter", () => {
      img.src = p.dataset.img;
      preview.classList.add("show");
    });
    p.addEventListener("mouseleave", () => preview.classList.remove("show"));
  });
  window.addEventListener("mousemove", (e) => {
    px += (e.clientX + 180 - px) * 0.15;
    py += (e.clientY - py) * 0.15;
  });
  (function follow() {
    px += 0; py += 0;
    preview.style.left = px + "px";
    preview.style.top = py + "px";
    requestAnimationFrame(follow);
  })();
})();
