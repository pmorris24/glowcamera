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

  // ---------- Animated character breaks between dark and light sections ----------
  // A band of text characters that crumbles from one color into the other. Some characters change
  // every frame, so the edge always moves a little.

  function mountDither(canvas) {
    var down = canvas.classList.contains("dither-down");
    var chars = ".:-=+*#%@";
    var cols = 0, rows = 0, cellW = 7, cellH = 11, grid = [], visible = false;
    function setup() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      cols = Math.ceil(canvas.clientWidth / cellW);
      rows = Math.ceil(canvas.clientHeight / cellH);
      grid = [];
      for (var i = 0; i < cols * rows; i++) grid.push({ r: Math.random(), c: Math.floor(Math.random() * chars.length) });
      draw(0);
    }
    function draw(t) {
      var dpr = canvas.width / Math.max(1, canvas.clientWidth);
      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.font = "600 10px ui-monospace, Menlo, monospace";
      ctx.textBaseline = "top";
      var light = "#f8fafb", dark = "#0d0d12";
      for (var y = 0; y < rows; y++) {
        // 0 at the dark side, 1 at the light side; the band breaks up around the middle.
        var f = down ? (y + 0.5) / rows : 1 - (y + 0.5) / rows;
        var wave = Math.sin(t / 900 + y) * 0.04;
        for (var x = 0; x < cols; x++) {
          var cell = grid[y * cols + x];
          var v = f + wave + (cell.r - 0.5) * 0.55;
          var px = x * cellW, py = y * cellH;
          if (v > 0.62) {
            ctx.fillStyle = light;
            ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
          } else if (v > 0.32) {
            // The crumbling edge: characters, light on dark, a few in gold.
            ctx.fillStyle = cell.r > 0.93 ? "#ffc54d" : "rgba(248,250,251," + (0.25 + (v - 0.32) * 2).toFixed(2) + ")";
            ctx.fillText(chars[cell.c], px, py);
          } else if (v > 0.2 && cell.r > 0.8) {
            ctx.fillStyle = "rgba(248,250,251,0.18)";
            ctx.fillText(".", px, py);
          }
        }
      }
    }
    var last = 0;
    function loop(t) {
      if (!visible) return;
      if (t - last > 90) {
        // A few characters change, and a few cells drift between sides.
        for (var i = 0; i < grid.length * 0.06; i++) {
          var g = grid[Math.floor(Math.random() * grid.length)];
          g.c = Math.floor(Math.random() * chars.length);
          g.r = Math.min(1, Math.max(0, g.r + (Math.random() - 0.5) * 0.25));
        }
        draw(t);
        last = t;
      }
      requestAnimationFrame(loop);
    }
    setup();
    var lastW = canvas.clientWidth;
    window.addEventListener("resize", function () { if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; setup(); } });
    if (reduceMotion) return;
    new IntersectionObserver(function (e) {
      var was = visible;
      visible = e[0].isIntersecting;
      if (visible && !was) requestAnimationFrame(loop);
    }).observe(canvas);
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

  // ---------- The hero: Glow's "g" in characters, radiating light ----------
  // The letter is drawn in bright characters. Around it, a halo and rings of light travel outward.
  // The pointer is a second light: the rays lean toward it and it brightens what it touches.

  function mountAscii(canvas) {
    var cols = 96, rows = 52;
    var cover = null, dist = null;
    var halo = " .,:;-=+*";
    var pointer = null, pointerFade = 0, visible = true;

    // Draw the letter large, then measure how much of each character cell it covers.
    function build() {
      var sx = 8, sy = 14;
      var off = document.createElement("canvas");
      off.width = cols * sx; off.height = rows * sy;
      var c = off.getContext("2d");
      c.fillStyle = "#fff";
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      var size = off.height * 0.95;
      // Inter's one-story g matches the app icon.
      c.font = "600 " + size + "px 'Inter', sans-serif";
      // A lowercase g: its x-height sits in the middle, its tail hangs below.
      c.fillText("g", off.width / 2, off.height * 0.62);
      var data = c.getImageData(0, 0, off.width, off.height).data;
      cover = new Float32Array(cols * rows);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var sum = 0;
        for (var yy = 0; yy < sy; yy++) for (var xx = 0; xx < sx; xx++) {
          sum += data[((y * sy + yy) * off.width + (x * sx + xx)) * 4 + 3];
        }
        cover[y * cols + x] = sum / (sx * sy * 255);
      }
      // Distance from each cell to the letter, in cell widths.
      dist = new Float32Array(cols * rows);
      var ratio = sy / sx;
      for (var j = 0; j < cols * rows; j++) dist[j] = cover[j] > 0.3 ? 0 : 1e9;
      for (var y1 = 0; y1 < rows; y1++) for (var x1 = 0; x1 < cols; x1++) {
        var k = y1 * cols + x1;
        if (x1 > 0) dist[k] = Math.min(dist[k], dist[k - 1] + 1);
        if (y1 > 0) dist[k] = Math.min(dist[k], dist[k - cols] + ratio);
      }
      for (var y2 = rows - 1; y2 >= 0; y2--) for (var x2 = cols - 1; x2 >= 0; x2--) {
        var k2 = y2 * cols + x2;
        if (x2 < cols - 1) dist[k2] = Math.min(dist[k2], dist[k2 + 1] + 1);
        if (y2 < rows - 1) dist[k2] = Math.min(dist[k2], dist[k2 + cols] + ratio);
      }
      begin();
    }
    (document.fonts && document.fonts.load ? document.fonts.load("600 100px 'Inter'") : Promise.resolve())
      .then(build, build);

    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      pointer = { x: (e.clientX - r.left) / r.width * cols, y: (e.clientY - r.top) / r.height * rows };
    });
    canvas.addEventListener("pointerleave", function () { pointer = null; });

    function draw(t) {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      var cw = W / cols, ch = H / rows, ratio = ch / cw;
      ctx.font = "600 " + Math.round(ch * 0.9) + "px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var cx = cols / 2, cy = rows * 0.5;
      var time = t / 1000;
      pointerFade += ((pointer ? 1 : 0) - pointerFade) * 0.12;
      var pa = pointer ? Math.atan2((pointer.y - cy) * ratio, pointer.x - cx) : 0;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var i = y * cols + x;
          var px = x + 0.5, py = y + 0.5;
          var cv = cover[i];
          if (cv > 0.3) {
            // The letter: dense where it is solid, lighter at its curved edges, with a slow shimmer.
            var sh = 0.88 + 0.12 * Math.sin(time * 2.6 + x * 0.5 - y * 0.3);
            ctx.fillStyle = "rgba(255,244,214," + (sh * (0.55 + 0.45 * cv)).toFixed(2) + ")";
            ctx.fillText(cv > 0.85 ? "@" : cv > 0.6 ? "#" : cv > 0.45 ? "*" : "+", px * cw, py * ch);
            continue;
          }
          var dx = px - cx, dy = (py - cy) * ratio;
          var d = Math.sqrt(dx * dx + dy * dy);
          var a = Math.atan2(dy, dx);
          // A thin glow hugging the letter, and narrow rings of light moving outward with soft rays.
          var glow = Math.exp(-dist[i] / 2.2) * 0.85;
          var ring = Math.pow(Math.max(0, Math.cos((d - time * 11) * 0.3)), 8) * Math.exp(-d / 70) * 1.15;
          var rays = Math.pow(0.5 + 0.5 * Math.cos(a * 12 + time * 0.5), 2);
          var v = glow + ring * (0.35 + 0.65 * rays);
          if (pointer) {
            var lean = Math.pow(Math.max(0, Math.cos(a - pa)), 6) * Math.exp(-d / 60);
            var qx = px - pointer.x, qy = (py - pointer.y) * ratio;
            v += pointerFade * (0.35 * lean * (0.5 + 0.5 * rays) + 0.6 * Math.exp(-(qx * qx + qy * qy) / 70));
          }
          if (v < 0.07) continue;
          v = Math.min(0.999, v);
          var idx = Math.max(1, Math.floor(v * halo.length));
          var warm = Math.min(1, v * 1.3);
          var G = Math.round(150 + 90 * warm), B = Math.round(50 + 120 * warm * warm);
          ctx.fillStyle = "rgba(255," + G + "," + B + "," + (0.2 + 0.8 * v).toFixed(2) + ")";
          ctx.fillText(halo[idx], px * cw, py * ch);
        }
      }
    }

    function begin() {
      draw(performance.now());
      if (reduceMotion) return;
      var last = 0;
      (function loop(t) {
        if (visible && t - last > 40) { draw(t); last = t; }
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
    document.addEventListener("click", function (e) {
      var go = e.target.closest("[data-try]");
      if (go && window.glowIsland) window.glowIsland.show(go.dataset.try);
    });
    document.querySelectorAll("[data-ascii]").forEach(mountAscii);
    root.dataset.motionReady = "1";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
