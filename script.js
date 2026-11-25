(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover)").matches;

  // Year
  $("#year").textContent = $("#year2").textContent = new Date().getFullYear();

  // Split headings into letters for the slide-up animation
  $$("[data-split]").forEach((el) => {
    const nodes = [...el.childNodes];
    el.textContent = "";
    el.setAttribute("aria-label", nodes.map((n) => n.textContent).join(""));
    let i = 0;
    nodes.forEach((node) => {
      const isEm = node.nodeType === 1 && node.tagName === "EM";
      const wrap = isEm ? document.createElement("em") : el;
      [...node.textContent].forEach((c) => {
        const s = document.createElement("span");
        s.className = "ch" + (c === " " ? " sp" : "");
        s.style.setProperty("--i", i++);
        s.setAttribute("aria-hidden", "true");
        s.textContent = c === " " ? "\u00A0" : c;
        wrap.appendChild(s);
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
    bar.style.width = (y / max) * 100 + "%";
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
  }, { threshold: 0.15 });
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

  // Filter
  const tiles = $$(".tile");
  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const f = chip.dataset.filter;
      tiles.forEach((t) => t.classList.toggle("hidden", f !== "all" && t.dataset.cat !== f));
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
  tiles.forEach((t) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      lbBody.style.backgroundImage = t.dataset.img ? `url("${t.dataset.img}")` : "";
      lbCap.textContent = t.dataset.title;
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => lb.classList.add("show"));
    });
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
