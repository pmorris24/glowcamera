// Glow Camera website: the live gradient field, reveal on scroll, the interactive notch island,
// and the contents highlight on the document pages. Everything works without this file;
// it only adds motion and the demo.
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Gradient field ----------
  // Each panel with [data-field] gets a low-resolution color field that CSS blurs into soft haze.
  // Two patches of light drift across it.

  var PALETTES = {
    sunrise: [[0, "#fff8ea"], [0.3, "#ffe7a8"], [0.52, "#ffc477"], [0.72, "#f39a8c"], [0.88, "#b98ad6"], [1, "#3a2440"]],
    dusk: [[0, "#d9824e"], [0.3, "#c9606f"], [0.62, "#8a5aa8"], [0.86, "#3d2552"], [1, "#21162b"]],
    honey: [[0, "#fffcf2"], [0.32, "#fff1c4"], [0.58, "#ffdd6a"], [0.8, "#ffc21f"], [1, "#f5ae00"]],
  };

  function hex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }

  function compile(stops) {
    return stops.map(function (s) { return [s[0], hex(s[1])]; });
  }

  function sample(stops, v, out) {
    v = Math.min(1, Math.max(0, v));
    for (var i = 1; i < stops.length; i++) {
      if (v <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i];
        var t = (v - a[0]) / (b[0] - a[0] || 1);
        t = t * t * (3 - 2 * t);
        out[0] = a[1][0] + (b[1][0] - a[1][0]) * t;
        out[1] = a[1][1] + (b[1][1] - a[1][1]) * t;
        out[2] = a[1][2] + (b[1][2] - a[1][2]) * t;
        return;
      }
    }
    var last = stops[stops.length - 1][1];
    out[0] = last[0]; out[1] = last[1]; out[2] = last[2];
  }

  function mountField(host) {
    var stops = compile(PALETTES[host.dataset.field] || PALETTES.sunrise);
    var haze = document.createElement("canvas");
    haze.className = "haze";
    host.prepend(haze);
    var hctx = haze.getContext("2d");
    if (!hctx) return;

    var w = 0, h = 0, cell = 14, cols = 0, rows = 0, image = null, visible = true, last = 0;
    var color = [0, 0, 0];
    var phase = Math.random() * 10;

    function resize() {
      var r = host.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      cell = w < 640 ? 11 : 14;
      cols = Math.ceil(w / cell);
      rows = Math.ceil(h / cell);
      haze.width = cols;
      haze.height = rows;
      image = hctx.createImageData(cols, rows);
    }

    function draw(time) {
      if (!image) return;
      var t = time / 1000 + phase;
      var data = image.data;
      var aspect = w / h;
      var s1x = 0.3 + Math.sin(t * 0.13) * 0.18, s1y = 0.28 + Math.cos(t * 0.11) * 0.1;
      var s2x = 0.72 + Math.cos(t * 0.09) * 0.16, s2y = 0.45 + Math.sin(t * 0.12) * 0.12;
      for (var row = 0; row < rows; row++) {
        var v = (row + 0.5) / rows;
        for (var col = 0; col < cols; col++) {
          var u = (col + 0.5) / cols;
          var wave = Math.sin(u * 5.2 + t * 0.35) * 0.035 + Math.sin(u * 2.1 - t * 0.21 + v * 3) * 0.03;
          var d1 = (u - s1x) * (u - s1x) * aspect * aspect + (v - s1y) * (v - s1y);
          var d2 = (u - s2x) * (u - s2x) * aspect * aspect + (v - s2y) * (v - s2y);
          var light = Math.exp(-d1 * 9) * 0.55 + Math.exp(-d2 * 11) * 0.4;
          sample(stops, v + wave - light * 0.16, color);
          var i = (row * cols + col) * 4;
          data[i] = Math.min(255, color[0] + light * 34);
          data[i + 1] = Math.min(255, color[1] + light * 26);
          data[i + 2] = Math.min(255, color[2] + light * 12);
          data[i + 3] = 255;
        }
      }
      hctx.putImageData(image, 0, 0);
    }

    function loop(time) {
      if (!visible) return;
      // About 24 frames per second is plenty for a slow drift.
      if (time - last > 40) {
        draw(time);
        last = time;
      }
      requestAnimationFrame(loop);
    }

    resize();
    draw(performance.now());
    window.addEventListener("resize", function () { resize(); draw(performance.now()); });

    if (reduceMotion) return;

    new IntersectionObserver(function (entries) {
      var was = visible;
      visible = entries[0].isIntersecting;
      if (visible && !was) requestAnimationFrame(loop);
    }).observe(host);
    requestAnimationFrame(loop);
  }

  // ---------- Reveal on scroll ----------

  function mountReveals() {
    var items = document.querySelectorAll("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  // ---------- The app window demo ----------

  var LOOKS = {
    natural: { smooth: 0.4, bright: 0.2, warm: 0.1, lips: 0, light: 0 },
    soft: { smooth: 0.65, bright: 0.35, warm: 0.2, lips: 0.15, light: 0.25 },
    studio: { smooth: 0.5, bright: 0.3, warm: 0.05, lips: 0.2, light: 0.7 },
    glam: { smooth: 0.75, bright: 0.3, warm: 0.25, lips: 0.6, light: 0.45 },
  };
  var ORIGINAL = { smooth: 0, bright: 0, warm: 0, lips: 0, light: 0 };

  function mix(a, b, t) {
    return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); });
  }

  function mountDemo(demo) {
    var portrait = demo.querySelector(".portrait");
    var svg = portrait && portrait.querySelector("svg");
    if (!svg) return;
    var screen = demo.querySelector(".screen");
    var state = { look: "natural", background: "off", comparing: false, mirrored: true, effects: {} };
    demo.querySelectorAll("[data-effect]").forEach(function (t) {
      state.effects[t.dataset.effect] = t.getAttribute("aria-pressed") === "true";
    });
    var q = function (sel) { return svg.querySelector(sel); };
    var texture = q("#texture"), skinBlur = q("#skin-blur feGaussianBlur"), warmth = q("#warmth"),
      lips = q("#lips"), keyLight = q("#key-light"), bgBlur = q("#bg-blur feGaussianBlur"),
      backdrop = q("#backdrop"), room = q("#room");

    function apply() {
      var fx = state.effects;
      var s = state.comparing ? ORIGINAL : LOOKS[state.look];
      // The effect tiles: Background blurs the room, Studio Light adds a key light,
      // Edge Light lights the screen's edge and the face, Center Stage frames closer.
      var bg = state.comparing ? "off" : (fx.background ? "blur" : state.background);
      if (!state.comparing && (fx.studio || fx.edge)) {
        s = Object.assign({}, s, { light: Math.max(s.light, fx.studio ? 0.85 : 0.5), bright: s.bright + (fx.edge ? 0.25 : 0) });
      }
      texture.style.opacity = (0.85 * (1 - s.smooth)).toFixed(2);
      skinBlur.setAttribute("stdDeviation", (s.smooth * 1.4).toFixed(2));
      svg.style.filter = "brightness(" + (1 + s.bright * 0.22).toFixed(3) + ") saturate(" + (1 + s.warm * 0.25).toFixed(3) + ")";
      warmth.style.opacity = (s.warm * 0.5).toFixed(2);
      var lip = mix([176, 104, 98], [168, 26, 74], s.lips);
      lips.setAttribute("fill", "rgb(" + lip.join(",") + ")");
      keyLight.style.opacity = s.light.toFixed(2);
      bgBlur.setAttribute("stdDeviation", bg === "blur" ? "9" : "0");
      backdrop.style.opacity = bg === "color" ? "1" : "0";
      room.style.opacity = bg === "color" ? "0" : "1";
      portrait.toggleAttribute("data-original", state.comparing);
      var scale = !state.comparing && fx.center ? 1.18 : 1;
      svg.style.transform = "scale(" + (state.mirrored ? -scale : scale) + "," + scale + ")";
      if (screen) screen.toggleAttribute("data-edge", !!fx.edge);
      demo.querySelectorAll("[data-effect]").forEach(function (t) {
        t.setAttribute("aria-pressed", String(!!fx[t.dataset.effect]));
      });
      var mirror = demo.querySelector("[data-mirror]");
      if (mirror) mirror.setAttribute("aria-pressed", String(state.mirrored));

      demo.querySelectorAll("[data-look]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.look === state.look));
      });
      demo.querySelectorAll("[data-background]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.background === state.background));
      });
      demo.querySelectorAll("[data-value]").forEach(function (row) {
        if (!row.querySelector("i")) return;
        var v = LOOKS[state.look][row.dataset.value];
        row.querySelector("i").style.setProperty("--v", Math.round(v * 100) + "%");
        row.querySelector("[data-percent]").textContent = Math.round(v * 100) + "%";
      });
      var name = demo.querySelector("[data-look-name]");
      if (name) name.textContent = state.look.charAt(0).toUpperCase() + state.look.slice(1);
    }

    demo.addEventListener("click", function (e) {
      var look = e.target.closest("[data-look]");
      var bg = e.target.closest("[data-background]");
      var effect = e.target.closest("[data-effect]");
      if (look) { state.look = look.dataset.look; apply(); }
      if (bg) { state.background = bg.dataset.background; apply(); }
      if (effect) { state.effects[effect.dataset.effect] = !state.effects[effect.dataset.effect]; apply(); }
      if (e.target.closest("[data-mirror]")) { state.mirrored = !state.mirrored; apply(); }
    });

    // Compare: hold to see the original, like the app (also Space while the demo has focus).
    var compare = demo.querySelector("[data-compare]");
    if (!compare) { apply(); return; }
    function setComparing(on) {
      state.comparing = on;
      compare.setAttribute("aria-pressed", String(on));
      apply();
    }
    ["pointerdown"].forEach(function (ev) { compare.addEventListener(ev, function (e) { e.preventDefault(); setComparing(true); }); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      compare.addEventListener(ev, function () { if (state.comparing) setComparing(false); });
    });
    compare.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setComparing(true); }
    });
    compare.addEventListener("keyup", function (e) {
      if (e.key === " " || e.key === "Enter") setComparing(false);
    });

    apply();

    // Until the visitor clicks something, play through the looks so the window shows what Glow does.
    if (reduceMotion) return;
    var tour = [
      { look: "natural", effects: { skin: true } },
      { look: "soft", effects: { skin: true, edge: true } },
      { look: "studio", effects: { skin: true, studio: true, background: true } },
      { look: "glam", effects: { skin: true, makeup: true, center: true, background: true } },
    ];
    var step = 0, onScreen = false, timer = null;
    function next() {
      if (!onScreen || state.comparing) return;
      step = (step + 1) % tour.length;
      state.look = tour[step].look;
      state.effects = Object.assign({}, tour[step].effects);
      apply();
    }
    function stopTour() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    timer = setInterval(next, 2600);
    demo.addEventListener("pointerdown", stopTour, { once: true });
    demo.addEventListener("keydown", stopTour, { once: true });
    new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; }).observe(demo);
  }

  // ---------- Contents highlight (document pages) ----------

  function mountToc(toc) {
    var links = Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']"));
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    if (!("IntersectionObserver" in window)) return;
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) current = entry.target.id;
      });
      links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + current); });
    }, { rootMargin: "0px 0px -70% 0px" });
    targets.forEach(function (t) { if (t) io.observe(t); });
  }

  // ---------- Hero product rises as the page starts to scroll ----------

  function mountRise(el) {
    if (reduceMotion) return;
    var ticking = false;
    function update() {
      var p = Math.min(1, window.scrollY / 520);
      var eased = 1 - Math.pow(1 - p, 3);
      el.style.transform = "translateY(" + ((1 - eased) * 64).toFixed(1) + "px) scale(" + (0.93 + eased * 0.07).toFixed(3) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ---------- Dithered edges between dark and light sections ----------
  // Squares of the two colors, more of the next color toward its side, like a printed halftone.

  function mountDither(canvas) {
    var down = canvas.classList.contains("dither-down");
    var dark = [13, 13, 18], light = [248, 250, 251], gold = [255, 194, 31];
    function draw() {
      var cell = 6;
      var w = Math.ceil(canvas.clientWidth / cell), h = Math.ceil(canvas.clientHeight / cell);
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      var img = ctx.createImageData(w, h);
      var seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var y = 0; y < h; y++) {
        var t = (y + 0.5) / h;
        var lightShare = down ? Math.pow(t, 1.6) : Math.pow(1 - t, 1.6);
        for (var x = 0; x < w; x++) {
          var r = rnd();
          var c = r < lightShare ? light : dark;
          // A few gold squares where the two meet.
          if (Math.abs(r - lightShare) < 0.012) c = gold;
          var i = (y * w + x) * 4;
          img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    draw();
    var last = canvas.clientWidth;
    window.addEventListener("resize", function () {
      if (canvas.clientWidth !== last) { last = canvas.clientWidth; draw(); }
    });
  }

  // ---------- The pixel lamp in the closing section ----------

  function mountPixels(host) {
    var art = [
      "...gg...",
      "..gGGg..",
      ".gGWWGg.",
      ".gGWWGg.",
      "..gGGg..",
      "...ss...",
      "...ss...",
      "..bbbb..",
    ];
    var colors = { g: "#b37800", G: "#ffc21f", W: "#fff1c4", s: "#3a3b4a", b: "#272835" };
    var cells = host.querySelectorAll("i");
    art.join("").split("").forEach(function (ch, i) {
      if (!cells[i] || ch === ".") return;
      cells[i].setAttribute("data-p", ch);
      cells[i].style.setProperty("--c", colors[ch]);
      cells[i].style.setProperty("--d", (Math.random() * 3).toFixed(2) + "s");
    });
  }

  // ---------- The hero portrait, drawn in characters ----------
  // "Before": gray, rough characters. A band of light passes over and leaves the portrait smooth and
  // warm, which is what Glow does to a camera picture.

  function mountAscii(canvas) {
    var source = document.querySelector(".vid-preview svg");
    if (!source) return;
    var tabs = canvas.parentElement.querySelectorAll(".hero-tabs span");
    var clone = source.cloneNode(true);
    clone.removeAttribute("style");
    clone.setAttribute("width", "800");
    clone.setAttribute("height", "500");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var img = new Image();
    var cols = 104, rows = 46, lum = null, noise = [];
    img.onload = function () {
      var off = document.createElement("canvas");
      off.width = cols; off.height = rows;
      var octx = off.getContext("2d");
      // Crop to the head and shoulders (4:3), then sharpen, so eyes and mouth read as characters.
      octx.drawImage(img, 140, 70, 520, 390, 0, 0, cols, rows);
      var data = octx.getImageData(0, 0, cols, rows).data;
      var raw = new Float32Array(cols * rows);
      for (var i = 0; i < cols * rows; i++) {
        raw[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
        noise.push(Math.random() - 0.5);
      }
      lum = new Float32Array(cols * rows);
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var sum = 0, n = 0;
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            var yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < rows && xx >= 0 && xx < cols) { sum += raw[yy * cols + xx]; n++; }
          }
          var v = raw[y * cols + x];
          v = v + (v - sum / n) * 1.8;
          // Darker middle tones keep the wall quiet; light areas stay dense.
          lum[y * cols + x] = Math.pow(Math.max(0, Math.min(1, v)), 1.7);
        }
      }
      start();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));

    var ramp = " .:-=+*#%@";
    var visible = true;
    function draw(t) {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== W) { canvas.width = W; canvas.height = H; }
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      var cw = W / cols, ch = H / rows;
      ctx.font = "600 " + Math.round(ch * 0.95) + "px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // One cycle: 2 s before, a 1.6 s sweep, 3 s of glow, a 1 s fade back.
      var cycle = 7600, k = reduceMotion ? 5000 : t % cycle;
      var sweep = k < 2000 ? -0.2 : k < 3600 ? (k - 2000) / 1600 * 1.4 - 0.2 : k < 6600 ? 1.2 : 1.2 - (k - 6600) / 1000 * 1.4;
      var glowing = k >= 2800 && k < 7100;
      if (tabs.length === 2) { tabs[0].classList.toggle("on", !glowing); tabs[1].classList.toggle("on", glowing); }
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = r * cols + c, u = c / cols;
          // How much light has reached this column, soft at the band's edge.
          var g = Math.max(0, Math.min(1, (sweep - u) / 0.18 + 0.5));
          var v = lum[i] + noise[i] * 0.32 * (1 - g);
          v = v * (1 + 0.35 * g) + 0.06 * g;
          v = Math.max(0, Math.min(0.999, v));
          var chIdx = Math.floor(v * ramp.length);
          if (chIdx === 0) continue;
          // Gray before, warm cream to gold after.
          var R = Math.round(120 + (255 - 120) * g), G = Math.round(126 + (214 - 126) * g * (0.6 + 0.4 * v)), B = Math.round(140 + (128 - 140) * g - 40 * g * (1 - v));
          ctx.fillStyle = "rgba(" + R + "," + G + "," + B + "," + (0.35 + 0.65 * v) + ")";
          ctx.fillText(ramp[chIdx], c * cw + cw / 2, r * ch + ch / 2);
        }
      }
    }
    function start() {
      draw(performance.now());
      if (reduceMotion) return;
      var last = 0;
      (function loop(t) {
        if (visible && t - last > 50) { draw(t); last = t; }
        requestAnimationFrame(loop);
      })(0);
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    }
  }

  function start() {
    document.querySelectorAll("[data-field]").forEach(mountField);
    mountReveals();
    document.querySelectorAll("[data-demo]").forEach(mountDemo);
    document.querySelectorAll("[data-toc]").forEach(mountToc);
    document.querySelectorAll("[data-rise]").forEach(mountRise);
    document.querySelectorAll("canvas[data-dither], [data-dither]").forEach(function (el) {
      if (el.tagName === "CANVAS") mountDither(el);
    });
    document.querySelectorAll(".pixels").forEach(mountPixels);
    document.querySelectorAll("[data-ascii]").forEach(mountAscii);
    root.dataset.motionReady = "1";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
