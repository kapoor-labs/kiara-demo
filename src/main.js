import {
  Store, defineSchema, textField, numberField, NormalizationProfile,
  createCondition, Operator, KeywordSearch, DictionaryTrie,
} from "@kapoorlabs/kiara-ts";
import { makeCatalog } from "./catalog.js";

(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // split headline words for the reveal
  document.querySelectorAll("h1, h2").forEach((h) => {
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach((child) => {
      if (child.nodeType !== 3) return walk(child);
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part.trim()) { frag.append(part); return; }
        const outer = document.createElement("span");
        outer.className = "wm";
        const inner = document.createElement("span");
        inner.style.setProperty("--i", i++);
        inner.textContent = part;
        outer.append(inner);
        frag.append(outer);
      });
      child.replaceWith(frag);
    });
    walk(h);
    h.classList.add("split");
  });
  document.querySelectorAll(".wipe").forEach((el) => el.append(Object.assign(document.createElement("i"), { className: "sweep" })));

  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal, [data-watch]:not(.wipe), #chart, .split").forEach((el) => io.observe(el));
  // IO never fires on a fully clipped element, so watch the parent
  const wipeIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.querySelectorAll(":scope > .wipe").forEach((w) => w.classList.add("in"));
      wipeIo.unobserve(e.target);
    }
  }, { threshold: 0.15 });
  document.querySelectorAll(".wipe").forEach((el) => wipeIo.observe(el.parentElement));

  // hero bg: trie lines + animated query path
  (function trieArt() {
    const svg = $("trie-art");
    const NS = "http://www.w3.org/2000/svg";
    const W = 1440, H = 900;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    const levels = [[{ x: 720, y: 70 }]];
    const fan = [5, 3, 2];
    fan.forEach((f, d) => {
      const prev = levels[d];
      const count = prev.length * f;
      const y = 70 + (d + 1) * 230;
      levels.push([]);
      prev.forEach((p, pi) => {
        for (let k = 0; k < f; k++) {
          const idx = pi * f + k;
          const x = 40 + ((idx + 0.5) / count) * (W - 80);
          levels[d + 1].push({ x, y, parent: p });
        }
      });
    });
    const curve = (a, b) => `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`;
    let order = 0;
    levels.slice(1).forEach((lvl, d) => lvl.forEach((n) => {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", curve(n.parent, n));
      path.setAttribute("class", "edge");
      svg.append(path);
      const len = Math.ceil(path.getTotalLength());
      path.style.setProperty("--len", len);
      path.style.animationDelay = `${0.3 + d * 0.5 + (order++ % 12) * 0.03}s`;
    }));
    levels.forEach((lvl, d) => lvl.forEach((n, k) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", n.x); c.setAttribute("cy", n.y); c.setAttribute("r", d === 0 ? 7 : 4.5 - d * 0.6);
      c.setAttribute("class", "node");
      c.style.transformOrigin = `${n.x}px ${n.y}px`;
      c.style.animationDelay = `${0.6 + d * 0.5 + k * 0.01}s`;
      svg.append(c);
    }));
    const leaves = levels[levels.length - 1];
    const q = document.createElementNS(NS, "path");
    q.setAttribute("class", "query");
    svg.append(q);
    const route = () => {
      const leaf = leaves[Math.floor(Math.random() * leaves.length)];
      const chain = [];
      for (let n = leaf; n; n = n.parent) chain.unshift(n);
      q.setAttribute("d", chain.slice(1).map((n, i) => curve(chain[i], n)).join(" "));
      q.style.setProperty("--len", Math.ceil(q.getTotalLength()));
    };
    route();
    q.style.animationDelay = "2.4s";
    q.addEventListener("animationiteration", route);
  })();

  // progress bar + chapter number parallax
  const chapters = [...document.querySelectorAll(".chapter")];
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      $("progress-line").style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      if (reduceMotion) return;
      for (const c of chapters) {
        const r = c.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const p = (innerHeight - r.top) / (innerHeight + r.height);
        c.style.transform = `translateY(${(p - 0.5) * -160}px)`;
      }
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // hero tilt + closing spotlight
  if (!reduceMotion && matchMedia("(pointer: fine)").matches) {
    const hero = document.querySelector(".hero");
    const media = document.querySelector(".hero-media");
    hero.addEventListener("pointermove", (e) => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      media.style.transform = `perspective(1200px) rotateY(${x * -7}deg) rotateX(${y * 5}deg)`;
    });
    hero.addEventListener("pointerleave", () => { media.style.transform = ""; });
    const closing = document.querySelector(".closing");
    closing.addEventListener("pointermove", (e) => {
      const r = closing.getBoundingClientRect();
      closing.style.setProperty("--mx", `${e.clientX - r.left}px`);
      closing.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

  // video clipped to the text
  (function videoType() {
    const canvas = $("vtext"), video = $("vtext-src");
    const ctx = canvas.getContext("2d");
    let lines = [], size = 0, w = 0, h = 0, visible = false;
    const layout = () => {
      w = canvas.clientWidth;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      lines = w < 720 ? ["Any field.", "Any mix."] : ["Any field. Any mix."];
      ctx.font = `400 100px "DM Serif Display", Georgia, serif`;
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      size = Math.floor((100 * w * 0.99) / widest);
      h = Math.ceil(size * 1.02 * lines.length + size * 0.12);
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (t) => {
      if (visible) requestAnimationFrame(draw);
      // text first, then fill with source-in (needed for 2 lines)
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.font = `400 ${size}px "DM Serif Display", Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#000";
      lines.forEach((l, i) => ctx.fillText(l, w / 2, size * (0.86 + i * 1.02)));
      ctx.globalCompositeOperation = "source-in";
      // navy fill until the video has a frame
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "#11263d"); g.addColorStop(1, "#1b3550");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // source-atop keeps the letter shape
      ctx.globalCompositeOperation = "source-atop";
      if (video.readyState >= 2 && video.videoWidth) {
        const zoom = 1.08 + Math.sin(t / 4000) * 0.05;
        const s = Math.max(w / video.videoWidth, h / video.videoHeight) * zoom;
        const vw = video.videoWidth * s, vh = video.videoHeight * s;
        ctx.drawImage(video, (w - vw) / 2, (h - vh) / 2, vw, vh);
        ctx.fillStyle = "rgba(17, 38, 61, 0.12)";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(185, 155, 98, 0.55)";
      ctx.lineWidth = 1;
      lines.forEach((l, i) => ctx.strokeText(l, w / 2, size * (0.86 + i * 1.02)));
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      layout();
      draw(0);
      addEventListener("resize", () => { layout(); draw(performance.now()); });
      new IntersectionObserver(([e]) => {
        const was = visible;
        visible = e.isIntersecting;
        if (visible) { video.play().catch(() => {}); if (!was) requestAnimationFrame(draw); }
        else video.pause();
      }).observe(canvas);
    });
    video.addEventListener("loadeddata", () => draw(performance.now()));
  })();

  // ripple on quiz answers
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".answer");
    if (!b || reduceMotion) return;
    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) / 2;
    const dot = Object.assign(document.createElement("span"), { className: "ripple" });
    Object.assign(dot.style, { width: `${d}px`, height: `${d}px`, left: `${e.clientX - r.left - d / 2}px`, top: `${e.clientY - r.top - d / 2}px` });
    b.append(dot);
    setTimeout(() => dot.remove(), 650);
  });
  new IntersectionObserver(([e]) => $("sticky").classList.toggle("on", !e.isIntersecting && e.boundingClientRect.top < 0))
    .observe(document.querySelector(".hero"));

  // tabs
  const tabs = [...document.querySelectorAll(".tab")];
  tabs.forEach((tab, i) => tab.addEventListener("click", () => {
    tabs.forEach((t, j) => {
      t.setAttribute("aria-selected", String(i === j));
      const panel = $("panel-" + j);
      panel.hidden = i !== j;
      panel.classList.toggle("show", i === j);
    });
  }));

  // bench chart, log scale 0.1 - 1000 ms
  const BENCH = [
    ["First 20 active products", 0.15, 75, "515\u00d7"],
    ["Stemmed \"chargers\", top 10", 1.0, 363, "365\u00d7"],
    ["Typo \"wireles lamp\", top 10", 1.95, 422, "216\u00d7"],
    ["One date equal", 0.28, 45, "163\u00d7"],
    ["Three fields equal", 0.37, 47, "128\u00d7"],
    ["Contains all of two tags", 3.2, 40, "12\u00d7"],
  ];
  const pos = (ms) => ((Math.log10(ms) + 1) / 4) * 100;
  $("bench-rows").innerHTML = BENCH.map(([q, k, f, x], i) => `
    <div class="brow"><span class="q">${esc(q)}</span>
      <div class="bars">
        <div class="bar k"><i style="width:${pos(k)}%;transition-delay:${i * 0.08}s"></i><em style="left:calc(${pos(k)}% + 8px)">${k} ms</em></div>
        <div class="bar f"><i style="width:${pos(f)}%;transition-delay:${i * 0.08 + 0.1}s"></i><em style="left:calc(${pos(f)}% + 8px)">${f} ms</em></div>
      </div>
      <span class="speed">${x}</span></div>`).join("");

  // faq
  const FAQ = [
    ["Is Kiara free to use?", "Yes. The Java library is licensed under Apache-2.0 and the TypeScript library under MIT. Both are on GitHub."],
    ["Does it store data on disk?", "No. Kiara is an in-memory, read-only store. You load records, prepare them, and search. To change the data, prepare a new snapshot and swap it in."],
    ["How much data can it handle?", "Records and indexes must fit in memory. In the published benchmark, preparing 100,000 records took 4.3 seconds and 489 MB. Measure with your own data, especially in a browser."],
    ["How is it different from Fuse.js?", "Fuse.js is a fuzzy matcher that builds quickly and tolerates looser spelling. Kiara prepares indexes so exact multi-field filters, stemming, one-edit typo fixes and type-ahead run fast on read-heavy data."],
    ["Which Java and TypeScript versions are supported?", "The Java library targets Java 8 and is tested on Java 8, 11, 17, 21 and 25. The TypeScript library is an ESM package with type declarations and uses standard TypeScript 5 decorators if you choose decorators."],
    ["Where can I ask questions or report a bug?", "Open an issue on the GitHub repository for the library you use. Feedback on use cases is welcome too."],
  ];
  $("faq-list").innerHTML = FAQ.map(([q, a], i) => `
    <div class="qa"><button type="button" aria-expanded="false" aria-controls="ans-${i}" id="qa-${i}">${esc(q)}</button>
    <div class="ans" id="ans-${i}" role="region" aria-labelledby="qa-${i}"><div><p>${esc(a)}</p></div></div></div>`).join("");
  $("faq-list").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) b.setAttribute("aria-expanded", String(b.getAttribute("aria-expanded") !== "true"));
  });

  // fit check quiz
  const QUESTIONS = [
    { q: "Where would Kiara run?", hint: "Pick the closest match.", key: "runtime",
      a: [["java", "Java, on a server (JVM)"], ["browser", "TypeScript, in the browser"], ["node", "TypeScript, on Node.js"], ["unsure", "Not sure yet"]] },
    { q: "How many records would you search?", hint: "A rough idea is enough.", key: "size",
      a: [["s", "Under 10,000"], ["m", "10,000 to 100,000"], ["l", "100,000 to 1 million"], ["xl", "More than 1 million"]] },
    { q: "How often does the data change?", hint: "Kiara searches a prepared snapshot of your data.", key: "writes",
      a: [["rare", "Rarely, daily or less"], ["some", "Every few minutes"], ["constant", "Constantly, many writes per second"]] },
    { q: "How many fields do users filter on?", hint: "Count the filters on your search page.", key: "fields",
      a: [["few", "1 or 2"], ["mid", "3 to 5"], ["many", "6 or more"]] },
    { q: "What do your users need most?", hint: "Choose the main one.", key: "need",
      a: [["typo", "A search box that forgives typos and plurals"], ["ahead", "Type-ahead suggestions"], ["combo", "Filters in any combination"], ["config", "Rules where the most specific match wins"]] },
  ];
  const answers = {};
  let step = 0;

  function verdict() {
    const reasons = [];
    let level = "good";
    if (answers.writes === "constant") {
      level = "no";
      reasons.push("Your data changes constantly. Kiara works from a prepared snapshot, so every change means preparing again. A database or a search server fits better.");
    } else if (answers.writes === "some") {
      reasons.push("Data that changes every few minutes works if you prepare a fresh snapshot in the background and swap it in.");
    } else {
      reasons.push("Read-heavy data that changes rarely is exactly what Kiara is built for.");
    }
    if (answers.size === "xl") {
      if (level === "good") level = "maybe";
      reasons.push("More than a million records must fit in memory with their indexes. Test memory early, or split the data by feature or key.");
    } else if (answers.size === "l") {
      reasons.push("At this size, prepare once at startup. The published benchmark prepared 100,000 records in 4.3 seconds.");
    }
    if (answers.fields === "few" && answers.need === "combo") {
      if (level === "good") level = "maybe";
      reasons.push("With only one or two filters, a plain filter may be enough. Kiara pays off when filters combine unpredictably.");
    } else if (answers.fields === "many") {
      reasons.push("With six or more filters, the number of combinations explodes. Kiara handles them all without index planning.");
    }
    const needText = {
      typo: "One-edit typo correction and stemming are built in.",
      ahead: "Type-ahead comes from the same dictionary the search uses.",
      combo: "Any combination of equality, range, list and date filters works from one prepared store.",
      config: "Hierarchical minimum-match lookups handle \"most specific rule wins\" configs.",
    };
    reasons.push(needText[answers.need]);
    return { level, reasons };
  }

  function renderStep(direction) {
    const body = $("quiz-body");
    $("quiz-bar").style.width = `${Math.min(step + 1, 5) * 20}%`;
    if (step < QUESTIONS.length) {
      const Q = QUESTIONS[step];
      $("quiz-step").textContent = `Step ${step + 1} of 5`;
      body.innerHTML = `<div class="step ${direction}"><div><h3 id="q-title">${esc(Q.q)}</h3><p class="hint">${esc(Q.hint)}</p></div>
        <div class="answers" role="radiogroup" aria-labelledby="q-title">${Q.a.map(([v, label]) =>
          `<button type="button" class="answer" role="radio" data-v="${v}" aria-checked="${answers[Q.key] === v}"><i></i>${esc(label)}</button>`).join("")}</div></div>`;
      $("quiz-next").hidden = false;
      $("quiz-next").disabled = !answers[Q.key];
      $("quiz-next").textContent = step === QUESTIONS.length - 1 ? "See my result \u2192" : "Continue \u2192";
    } else {
      const v = verdict();
      const tag = { good: ["good", "Strong fit"], maybe: ["maybe", "Worth a try, with care"], no: ["no", "Probably not the right tool"] }[v.level];
      const java = answers.runtime === "java";
      const install = java ? "com.kapoorlabs:kiara:2.0.15" : "npm install @kapoorlabs/kiara-ts";
      const repo = java ? "https://github.com/kapoorlabs/kiara" : "https://github.com/kapoorlabs/kiara-ts";
      $("quiz-step").textContent = "Your result";
      body.innerHTML = `<div class="step ${direction} verdict"><span class="tag ${tag[0]}">${tag[1]}</span>
        <h3>${v.level === "no" ? "Kiara isn't built for this case." : "Here's how Kiara fits your data."}</h3>
        <ul>${v.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
        ${v.level === "no" ? "" : `<div class="install"><span id="install-text">${esc(install)}</span><button type="button" id="install-copy">Copy</button></div>`}
        <div class="ctas"><a class="btn primary" href="${repo}" target="_blank" rel="noopener">Open the repository \u2192</a><a class="btn line" href="#try">Try the live demo</a></div></div>`;
      $("quiz-next").hidden = true;
      $("install-copy")?.addEventListener("click", async (e) => {
        try { await navigator.clipboard.writeText(install); e.target.textContent = "Copied"; } catch { e.target.textContent = "Select and copy"; }
      });
    }
    $("quiz-back").disabled = step === 0;
  }
  $("quiz-body").addEventListener("click", (e) => {
    const b = e.target.closest(".answer");
    if (!b) return;
    answers[QUESTIONS[step].key] = b.dataset.v;
    b.parentElement.querySelectorAll(".answer").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    $("quiz-next").disabled = false;
  });
  $("quiz-next").addEventListener("click", () => { if (step < QUESTIONS.length) { step++; renderStep("enter"); } });
  $("quiz-back").addEventListener("click", () => { if (step > 0) { step--; renderStep("enter-back"); } });
  renderStep("");

  // count up numbers
  const counter = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || reduceMotion) continue;
      counter.unobserve(e.target);
      const el = e.target;
      const target = Number(el.dataset.count);
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / 1100, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => counter.observe(el));

  // ---- playground ----
  const RECORDS = 10000;
  const SHOWN = 50;
  const DISPLAYED = 12;

  const rows = makeCatalog(RECORDS);
  const schema = defineSchema([
    textField("category", { caseInsensitive: true }),
    textField("brand", { caseInsensitive: true }),
    textField("color", { caseInsensitive: true }),
    numberField("rating"),
    numberField("price"),
    textField("tags", { secondaryType: "commaSeparatedStrings", caseInsensitive: true }),
    textField("name", { caseInsensitive: true, oneEditAway: true, stemmedIndex: true }),
    textField("sku", { caseInsensitive: true }),
  ]);
  const state = { category: null, brands: new Set(), colors: new Set(), tags: new Set(), tagMode: "any" };
  let store, keywordSearch, dictionary;

  const OPTIONS = {
    category: ["laptop", "headphones", "monitor", "keyboard", "camera", "speaker"],
    brand: ["Nordline", "Voltera", "Quanta", "Altair", "Brightway", "Kestrel", "Orion", "Pixelforge"],
    color: ["black", "silver", "white", "blue", "red", "green"],
    tags: ["bluetooth", "usb-c", "rgb", "waterproof", "portable", "refurbished", "eco", "wireless-charging"],
  };
  // unsplash images
  const unsplash = (id) => `https://images.unsplash.com/photo-${id}?w=640&h=480&fit=crop&q=70&fm=jpg`;
  const IMAGES = {
    laptop: [unsplash("1517336714731-489689fd1ca8"), unsplash("1496181133206-80ce9b88a853")],
    headphones: [unsplash("1505740420928-5e560c06d30e"), unsplash("1546435770-a3e426bf472b")],
    monitor: [unsplash("1585792180666-f7347c490ee2"), unsplash("1527443224154-c4a3942d3acf")],
    keyboard: [unsplash("1618384887929-16ec33fab9ef"), unsplash("1587829741301-dc798b83add3")],
    camera: [unsplash("1516035069371-29a1b244cc32")],
    speaker: [unsplash("1545454675-3531b543be5d")],
  };
  const SWATCH = { black: "#1f2328", silver: "#c0c7d2", white: "#ffffff", blue: "#3b6fd8", red: "#c8402f", green: "#47705d" };
  const imageFor = (r) => {
    const list = IMAGES[r.category];
    return list[Number(r.sku.slice(3)) % list.length];
  };

  function chip(label, pressed, onClick, swatch) {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    if (swatch) {
      const d = document.createElement("span");
      d.className = "dot";
      d.style.background = swatch;
      b.append(d);
    }
    b.append(label);
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick);
    return b;
  }

  function catTile(value, label, img) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cat" + (img ? "" : " all");
    b.setAttribute("aria-pressed", String(state.category === value));
    b.innerHTML = (img ? `<img src="${img}" alt="" loading="lazy">` : "") + `<span>${label}</span>`;
    b.addEventListener("click", () => { state.category = value; update(); });
    return b;
  }

  function renderFilters() {
    $("f-category").replaceChildren(catTile(null, "All"), ...OPTIONS.category.map((c) => catTile(c, c, IMAGES[c][0])));
    const multi = (el, values, set, swatches) => el.replaceChildren(...values.map((v) => chip(v, set.has(v), () => {
      set.has(v) ? set.delete(v) : set.add(v);
      update();
    }, swatches && swatches[v])));
    multi($("f-brand"), OPTIONS.brand, state.brands);
    multi($("f-color"), OPTIONS.color, state.colors, SWATCH);
    multi($("f-tags"), OPTIONS.tags, state.tags);
    $("f-tagmode").textContent = state.tagMode === "any" ? "match any" : "match all";
  }

  function readNumber(id) {
    const v = $(id).value.trim();
    return v === "" || Number.isNaN(Number(v)) ? null : Number(v);
  }

  // condition + ts snippet shown in the code panel
  function buildConditions() {
    const out = [];
    const list = (values) => "[" + values.map((v) => JSON.stringify(v)).join(", ") + "]";
    if (state.category) {
      out.push({ c: createCondition({ field: "category", operator: Operator.EQUAL, values: [state.category] }),
        ts: `{ field: "category", operator: Operator.EQUAL, values: ${list([state.category])} }` });
    }
    if (state.brands.size) {
      const v = [...state.brands].map((b) => b.toLowerCase());
      out.push({ c: createCondition({ field: "brand", operator: Operator.EQUAL, values: v }),
        ts: `{ field: "brand", operator: Operator.EQUAL, values: ${list(v)} }` });
    }
    if (state.colors.size) {
      const v = [...state.colors];
      out.push({ c: createCondition({ field: "color", operator: Operator.EQUAL, values: v }),
        ts: `{ field: "color", operator: Operator.EQUAL, values: ${list(v)} }` });
    }
    const min = readNumber("f-min");
    const max = readNumber("f-max");
    if (min !== null || max !== null) {
      const lo = min ?? 0;
      const hi = max ?? 100000;
      out.push({ c: createCondition({ field: "price", operator: Operator.BETWEEN, lowerValue: lo, upperValue: hi }),
        ts: `{ field: "price", operator: Operator.BETWEEN, lowerValue: ${lo}, upperValue: ${hi} }` });
    }
    const rating = $("f-rating").value;
    if (rating) {
      out.push({ c: createCondition({ field: "rating", operator: Operator.GREATER_THAN_EQUAL, values: [Number(rating)] }),
        ts: `{ field: "rating", operator: Operator.GREATER_THAN_EQUAL, values: [${rating}] }` });
    }
    if (state.tags.size) {
      const op = state.tagMode === "any" ? "CONTAINS_EITHER" : "CONTAINS_ALL";
      const v = [...state.tags];
      out.push({ c: createCondition({ field: "tags", operator: Operator[op], values: v }),
        ts: `{ field: "tags", operator: Operator.${op}, values: ${list(v)} }` });
    }
    return out;
  }

  // run fast queries in a loop for ~4ms, timer resolution is too coarse otherwise
  function timed(fn) {
    let runs = 0;
    let result;
    const start = performance.now();
    do { result = fn(); runs++; } while (performance.now() - start < 4 && runs < 200);
    return { result, ms: (performance.now() - start) / runs };
  }

  function highlight(name, words) {
    if (!words.size) return esc(name);
    return name.split(" ").map((w) => (words.has(w.toLowerCase()) ? `<mark>${esc(w)}</mark>` : esc(w))).join(" ");
  }

  function renderCode(text, conds) {
    const block = (indent) => conds.length
      ? `[\n${conds.map((x) => `${indent}  createCondition(${x.ts}),`).join("\n")}\n${indent}]`
      : "[]";
    let code;
    if (text) {
      code = `const { results, correctedKeywords } = keywordSearch.bestMatch(${JSON.stringify(text)}, {\n  fields: ["name"],\n  conditions: ${block("  ")},\n  limit: ${SHOWN},\n});`;
    } else if (conds.length) {
      code = `const results = store.search(${block("")});`;
    } else {
      code = `const results = store.queryAll(${SHOWN});`;
    }
    $("code").innerHTML = esc(code)
      .replace(/(&quot;[^&]*&quot;)/g, '<span class="s">$1</span>')
      .replace(/\b(const|Operator|createCondition|keywordSearch|store)\b/g, '<span class="k">$1</span>');
    $("code").dataset.plain = code;
  }

  function card(r, matched, i) {
    const tags = r.tags.split(", ").map((t) => `<span>${esc(t)}</span>`).join("");
    return `<article class="card" style="animation-delay:${i * 35}ms"><div class="card-media"><span class="badge">${esc(r.category)}</span>` +
      `<img src="${imageFor(r)}" alt="" loading="lazy"></div><div class="card-body">` +
      `<h4>${highlight(r.name, matched)}</h4>` +
      `<div class="meta"><span class="dot" style="background:${SWATCH[r.color]}"></span>${esc(r.brand)} \u00b7 ${esc(r.color)}</div>` +
      `<div class="row"><span class="price">$${r.price.toLocaleString("en-US")}</span><span class="stars">\u2605 ${r.rating.toFixed(1)}</span></div>` +
      `<div class="tags">${tags}</div></div></article>`;
  }

  function update() {
    renderFilters();
    const text = $("q").value.trim();
    const conds = buildConditions();
    const conditions = conds.map((x) => x.c);
    let shown, total, fixes = {}, matched = new Set(), ms;

    if (text) {
      const t = timed(() => keywordSearch.bestMatch(text, { fields: ["name"], conditions, limit: SHOWN }));
      ms = t.ms;
      shown = t.result.results;
      fixes = t.result.correctedKeywords;
      matched = new Set(t.result.matchedKeywords);
      total = null;
    } else if (conditions.length) {
      const t = timed(() => store.search(conditions));
      ms = t.ms;
      total = t.result.length;
      shown = t.result.slice(0, SHOWN);
    } else {
      const t = timed(() => store.queryAll(SHOWN));
      ms = t.ms;
      shown = t.result;
      total = rows.length;
    }

    // mark the real word when a typo/plural was fixed
    for (const word of Object.values(fixes)) matched.add(word);

    $("count").textContent = total === null
      ? (shown.length ? `Top ${shown.length} matches` : "No matches")
      : `${total.toLocaleString("en-US")} ${total === 1 ? "result" : "results"}`;
    $("time").textContent = `${ms < 0.1 ? ms.toFixed(3) : ms.toFixed(2)} ms`;

    const used = conds.length + (text ? 1 : 0);
    $("combo").textContent = used
      ? `${used} of 7 fields combined \u00b7 no index written for this combination`
      : "7 searchable fields \u00b7 127 possible combinations";

    const fixEntries = Object.entries(fixes);
    $("fixes").hidden = fixEntries.length === 0;
    $("fixes").innerHTML = fixEntries.length
      ? `<span>Corrected:</span>` + fixEntries.map(([from, to]) => `<span class="fix"><s>${esc(from)}</s> \u2192 ${esc(to)}</span>`).join("")
      : "";

    $("rows").innerHTML = shown.length
      ? shown.slice(0, DISPLAYED).map((r, i) => card(r, matched, i)).join("")
      : `<div class="empty">Nothing matches this combination. Remove a filter or try another word.</div>`;
    $("shown-note").hidden = shown.length <= DISPLAYED;
    $("shown-note").textContent = `Showing the first ${DISPLAYED} of these.`;

    renderCode(text, conds);
  }

  // type-ahead
  let activeSuggestion = -1;
  function suggestions() {
    const input = $("q");
    const words = input.value.toLowerCase().split(/\s+/);
    const last = words[words.length - 1];
    const list = $("suggest");
    if (!dictionary || last.length < 2) return closeSuggest();
    const hits = dictionary.predict(last, 6).filter((w) => w !== last);
    if (!hits.length) return closeSuggest();
    activeSuggestion = -1;
    list.innerHTML = hits.map((w, i) => `<li role="option" id="sg-${i}" data-word="${esc(w)}"><span>${esc(last)}</span>${esc(w.slice(last.length))}</li>`).join("");
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  function closeSuggest() {
    $("suggest").hidden = true;
    $("q").setAttribute("aria-expanded", "false");
    $("q").removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  }
  function accept(word) {
    const input = $("q");
    const parts = input.value.split(/(\s+)/);
    parts[parts.length - 1] = word;
    input.value = parts.join("") + " ";
    closeSuggest();
    input.focus();
    update();
  }
  function moveSuggestion(stepBy) {
    const items = [...$("suggest").children];
    if (!items.length) return;
    activeSuggestion = (activeSuggestion + stepBy + items.length) % items.length;
    items.forEach((li, i) => li.setAttribute("aria-selected", String(i === activeSuggestion)));
    $("q").setAttribute("aria-activedescendant", items[activeSuggestion].id);
  }

  const PRESETS = {
    typo: { q: "wireles hedphones" },
    plural: { q: "gaming laptops", max: 800, rating: "4" },
    combo: { brands: ["Kestrel"], colors: ["red"], tags: ["usb-c"] },
    range: { category: "monitor", min: 200, max: 400 },
  };
  function clearAll() {
    state.category = null;
    state.brands.clear();
    state.colors.clear();
    state.tags.clear();
    state.tagMode = "any";
    $("f-min").value = "";
    $("f-max").value = "";
    $("f-rating").value = "";
  }
  function applyPreset(name) {
    const p = PRESETS[name];
    clearAll();
    $("q").value = p.q ?? "";
    state.category = p.category ?? null;
    (p.brands ?? []).forEach((b) => state.brands.add(b));
    (p.colors ?? []).forEach((c) => state.colors.add(c));
    (p.tags ?? []).forEach((t) => state.tags.add(t));
    if (p.min !== undefined) $("f-min").value = p.min;
    if (p.max !== undefined) $("f-max").value = p.max;
    if (p.rating) $("f-rating").value = p.rating;
    closeSuggest();
    update();
  }

  function wire() {
    const input = $("q");
    input.addEventListener("input", () => { suggestions(); update(); });
    input.addEventListener("keydown", (e) => {
      const open = !$("suggest").hidden;
      if (e.key === "ArrowDown" && open) { e.preventDefault(); moveSuggestion(1); }
      else if (e.key === "ArrowUp" && open) { e.preventDefault(); moveSuggestion(-1); }
      else if ((e.key === "Enter" || e.key === "Tab") && open && activeSuggestion >= 0) {
        e.preventDefault();
        accept($("suggest").children[activeSuggestion].dataset.word);
      } else if (e.key === "Escape") closeSuggest();
    });
    input.addEventListener("blur", () => setTimeout(closeSuggest, 120));
    $("suggest").addEventListener("mousedown", (e) => {
      const li = e.target.closest("li");
      if (li) { e.preventDefault(); accept(li.dataset.word); }
    });
    ["f-min", "f-max", "f-rating"].forEach((id) => $(id).addEventListener("input", update));
    $("f-tagmode").addEventListener("click", () => { state.tagMode = state.tagMode === "any" ? "all" : "any"; update(); });
    $("reset").addEventListener("click", () => { clearAll(); $("q").value = ""; update(); });
    document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => applyPreset(b.dataset.preset)));
    $("copy").addEventListener("click", async () => {
      const btn = $("copy");
      try {
        await navigator.clipboard.writeText($("code").dataset.plain);
        btn.textContent = "Copied";
      } catch {
        const range = document.createRange();
        range.selectNodeContents($("code"));
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        btn.textContent = "Press Ctrl+C";
      }
      setTimeout(() => { btn.textContent = "Copy"; }, 1800);
    });
  }

  // build the store after first paint
  function boot() {
    store = new Store(schema, { normalizationProfile: NormalizationProfile.NATIVE });
    store.loadRows(rows);
    store.prepare();
    keywordSearch = new KeywordSearch(store);
    keywordSearch.bestMatch("warm up", { fields: ["name"], limit: 1 });
    dictionary = new DictionaryTrie();
    for (const r of rows) dictionary.addText(r.name.toLowerCase());
    wire();
    applyPreset("typo");
  }
  requestAnimationFrame(() => setTimeout(boot, 60));
})();
