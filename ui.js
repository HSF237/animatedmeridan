/* Shared interface behaviour for every page: loader, reveals, counters, cursor,
   tilt cards, magnetic buttons, mobile menu and the contact form. */
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

export function initUI({ onStart = () => {}, loaderMs = 1600, isReady = () => true } = {}) {
  document.body.classList.add("loading");
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Loader: counts up, and only finishes once the scene says it is ready
  const loader = document.getElementById("loader");
  const loaderCount = document.getElementById("loaderCount");
  const t0 = performance.now();
  (function step() {
    const k = smooth(clamp01((performance.now() - t0) / loaderMs));
    const v = Math.floor(k * (isReady() ? 100 : 94));
    if (loaderCount) loaderCount.textContent = v;
    if (v < 100) return requestAnimationFrame(step);
    setTimeout(() => {
      loader && loader.classList.add("done");
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
      onStart();
    }, 200);
  })();

  // Reveal on scroll
  const countUp = (el) => {
    const end = +el.dataset.count;
    const start = performance.now();
    (function s(now) {
      const k = clamp01((now - start) / 2000);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(s);
    })(start);
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
        e.target.querySelectorAll?.("[data-count]").forEach(countUp);
        if (e.target.dataset && e.target.dataset.count) countUp(e.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -5% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Scroll-linked UI: progress bar, nav, timeline
  const nav = document.getElementById("nav");
  const progressBar = document.getElementById("progressBar");
  const timelineFill = document.getElementById("timelineFill");
  const timeline = document.querySelector(".timeline");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${p})`;
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);
    if (timeline && timelineFill) {
      const r = timeline.getBoundingClientRect();
      const k = clamp01((window.innerHeight * 0.8 - r.top) / (r.height + window.innerHeight * 0.3));
      timelineFill.style.transform = window.innerWidth > 960 ? `scaleY(${k})` : `scaleX(${k})`;
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Custom cursor
  const cursor = document.getElementById("cursor");
  const dot = document.getElementById("cursorDot");
  if (cursor && dot) {
    const cur = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2 };
    window.addEventListener("pointermove", (e) => {
      cur.x = e.clientX;
      cur.y = e.clientY;
      dot.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    });
    (function loop() {
      cur.cx = lerp(cur.cx, cur.x, 0.16);
      cur.cy = lerp(cur.cy, cur.y, 0.16);
      cursor.style.transform = `translate(${cur.cx}px, ${cur.cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll("[data-hover], a, button, input, textarea, select").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("hover"));
    });
  }

  if (!reducedMotion) {
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateZ(10px)`;
      });
      card.addEventListener("pointerleave", () => (card.style.transform = ""));
    });
    document.querySelectorAll(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
    });
  }

  // Page transitions: wipe the loader curtain across before navigating between pages
  if (loader) {
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) loader.classList.add("done");
    });
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!/^[\w-]+\.html(#.*)?$/.test(href) || a.target) return;
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const same = href.split("#")[0] === (location.pathname.split("/").pop() || "index.html");
        if (same) return;
        e.preventDefault();
        loader.classList.remove("done");
        loader.style.transition = "clip-path 0.7s cubic-bezier(0.19, 1, 0.22, 1)";
        loader.style.clipPath = "inset(100% 0 0 0)";
        void loader.offsetWidth;
        loader.style.clipPath = "inset(0 0 0 0)";
        loader.style.visibility = "visible";
        setTimeout(() => (location.href = href), 620);
      });
    });
  }

  // Mobile menu
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("navLinks");
  if (burger && navLinks) {
    burger.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      burger.setAttribute("aria-expanded", open);
    });
    navLinks.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        navLinks.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Contact form (front-end only)
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = document.getElementById("formNote");
      const name = new FormData(form).get("name");
      window.dispatchEvent(new CustomEvent("enquiry-sent"));
      if (note) note.textContent = `Thank you, ${name}. Our studio will be in touch within two working days.`;
      form.reset();
    });
  }
}
