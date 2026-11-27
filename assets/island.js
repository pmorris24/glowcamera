// The hero demo: Glow's island at the notch of a MacBook. Point at the notch to open it, change
// looks and effects, and watch the call window change with it. Until the visitor moves the pointer
// over the Mac, a cursor shows how it works. Everything works with a mouse, touch and the keyboard.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var LOOKS = {
    natural: { smooth: 0.4, bright: 0.2, warm: 0.1, lips: 0.1, light: 0.15 },
    soft: { smooth: 0.65, bright: 0.35, warm: 0.25, lips: 0.2, light: 0.3 },
    studio: { smooth: 0.5, bright: 0.3, warm: 0.05, lips: 0.25, light: 0.7 },
    glam: { smooth: 0.75, bright: 0.3, warm: 0.25, lips: 0.65, light: 0.45 },
  };
  var SHADES = ["#a81a4a", "#c2453d", "#b0527a", "#7a2440"];
  var BACKDROPS = {
    color: ["#5d6b8a", "#3d4763"],
    gradient: ["#ffb36b", "#8a4fd0"],
  };

  // The controls in each effect's drawer.
  var CONTROLS = {
    skin: [["smooth", "Smooth skin"], ["bright", "Brighten"], ["warm", "Warmth"]],
    face: [["slim", "Slim face"]],
    makeup: [["lips", "Lip color"], ["shade"]],
    lighting: [["light", "Strength"]],
    studio: [["studio", "Intensity"]],
    edge: [["edgeBright", "Brightness"], ["edgeWidth", "Width"]],
    background: [["bgStyle"], ["blur", "Blur"]],
    center: [["zoom", "Zoom"]],
    presenter: [["presenterStyle"]],
    reactions: [["reactions"]],
  };
  var NAMES = {
    skin: "Skin & Light", face: "Face Shape", makeup: "Makeup", lighting: "Lighting", studio: "Studio Light",
    edge: "Edge Light", background: "Background", center: "Center Stage", presenter: "Presenter Overlay", reactions: "Reactions",
  };
  var REACTIONS = [
    ["hearts", "Hearts"], ["thumbs", "Thumbs Up"], ["balloons", "Balloons"], ["confetti", "Confetti"],
    ["fireworks", "Fireworks"], ["rain", "Rain"], ["lasers", "Lasers"],
  ];

  function mount(demo) {
    var screen = demo.querySelector(".mb-screen");
    var isle = demo.querySelector("[data-isle]");
    var drawer = demo.querySelector("[data-drawer]");
    var hint = demo.querySelector(".hint");
    var ghost = demo.querySelector(".ghost");
    var previewVid = demo.querySelector('[data-video="preview"]');
    var callVid = demo.querySelector('[data-video="call"]');
    var previewSvg = previewVid.querySelector("svg");

    // The call shows the same picture. Copy the drawing with its own ids, so its filters are its own.
    var copy = previewSvg.outerHTML
      .replace(/id="([\w-]+)"/g, 'id="$1-call"')
      .replace(/url\(#([\w-]+)\)/g, "url(#$1-call)");
    callVid.querySelector(".cam").innerHTML = copy;
    var callSvg = callVid.querySelector("svg");

    var state = {
      open: false, pinned: false, filters: true, comparing: false, mirrored: true,
      look: "natural", selected: null,
      on: { skin: true },
      v: Object.assign({}, LOOKS.natural, {
        slim: 0.3, shade: 0, studio: 0.6, edgeBright: 0.85, edgeWidth: 0.5,
        bgStyle: "blur", blur: 0.6, zoom: 0.5, presenterStyle: "small",
      }),
    };

    // ---------- Drawing the video ----------

    function mix(a, b, t) {
      return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); });
    }
    function hexRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }

    function paint(svg, vid, preview) {
      var q = function (id) { return svg.querySelector("#" + id + (preview ? "" : "-call")); };
      var active = state.filters && !(preview && state.comparing);
      var on = function (k) { return active && !!state.on[k]; };
      var v = state.v;
      var smooth = on("skin") ? v.smooth : 0;
      var bright = on("skin") ? v.bright : 0;
      var warm = on("skin") ? v.warm : 0;
      var light = on("lighting") ? v.light : 0;
      if (on("studio")) light = Math.max(light, 0.5 + v.studio * 0.4);
      if (on("edge")) bright += 0.12 + v.edgeBright * 0.18;

      q("texture").style.opacity = (0.85 * (1 - smooth)).toFixed(2);
      q("skin-blur").querySelector("feGaussianBlur").setAttribute("stdDeviation", (smooth * 1.6).toFixed(2));
      svg.style.filter = "brightness(" + (1 + bright * 0.22).toFixed(3) + ") saturate(" + (1 + warm * 0.25).toFixed(3) + ")";
      q("warmth").style.opacity = (warm * 0.5).toFixed(2);
      q("key-light").style.opacity = light.toFixed(2);

      var lipTarget = hexRgb(SHADES[v.shade] || SHADES[0]);
      var lip = mix([176, 104, 98], lipTarget, on("makeup") ? v.lips : 0);
      q("lips").setAttribute("fill", "rgb(" + lip.join(",") + ")");

      var slim = on("face") ? 1 - v.slim * 0.09 : 1;
      q("face").setAttribute("transform", "translate(400 0) scale(" + slim.toFixed(3) + " 1) translate(-400 0)");

      var presenter = on("presenter");
      var large = presenter && v.presenterStyle === "large";
      var bg = on("background") ? v.bgStyle : "off";
      q("bg-blur").querySelector("feGaussianBlur").setAttribute("stdDeviation", bg === "blur" ? (v.blur * 14).toFixed(1) : "0");
      var backdrop = q("backdrop");
      if (bg === "color" || bg === "gradient") {
        var stops = backdrop.ownerSVGElement.querySelectorAll("#backdrop-fill" + (preview ? "" : "-call") + " stop");
        stops[0].setAttribute("stop-color", BACKDROPS[bg][0]);
        stops[1].setAttribute("stop-color", BACKDROPS[bg][1]);
      }
      backdrop.style.opacity = (bg === "color" || bg === "gradient") && !large ? "1" : "0";
      q("room").style.opacity = large ? "0" : "1";
      q("dim").style.opacity = on("studio") && !large ? (0.25 + v.studio * 0.35).toFixed(2) : "0";

      vid.classList.toggle("presenting", presenter);
      vid.classList.toggle("presenting-large", large);

      var zoom = on("center") && !presenter ? 1 + v.zoom * 0.32 : 1;
      var flip = preview && state.mirrored && !presenter ? -1 : 1;
      svg.style.transform = "scale(" + (flip * zoom).toFixed(3) + "," + zoom.toFixed(3) + ")";
    }

    function render() {
      paint(previewSvg, previewVid, true);
      paint(callSvg, callVid, false);
      previewVid.toggleAttribute("data-original", state.comparing);

      var edge = state.filters && state.on.edge;
      screen.toggleAttribute("data-edge", !!edge);
      screen.style.setProperty("--edge-a", (0.35 + state.v.edgeBright * 0.65).toFixed(2));
      screen.style.setProperty("--edge-w", Math.round(5 + state.v.edgeWidth * 16) + "px");

      demo.querySelectorAll("[data-look]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(state.filters && b.dataset.look === state.look));
      });
      demo.querySelectorAll("[data-effect]").forEach(function (t) {
        var k = t.dataset.effect;
        t.setAttribute("aria-pressed", String(!!state.on[k]));
        t.classList.toggle("selected", state.selected === k);
        t.disabled = !state.filters && k !== "edge";
      });
      demo.querySelector("[data-mirror]").setAttribute("aria-pressed", String(state.mirrored));
      demo.querySelector("[data-filters]").checked = state.filters;
      demo.querySelector("[data-pin]").setAttribute("aria-pressed", String(state.pinned));
      isle.classList.toggle("filters-off", !state.filters);
    }

    // ---------- The drawer ----------

    function slider(key, label) {
      var value = Math.round(state.v[key] * 100);
      return '<label class="ctl"><span class="ctl-row"><span>' + label + '</span><span class="pct" data-pct="' + key + '">' + value +
        '%</span></span><input type="range" min="0" max="100" value="' + value + '" data-slider="' + key + '"></label>';
    }

    function segmented(key, options) {
      return '<div class="seg" role="group">' + options.map(function (o) {
        return '<button type="button" data-set="' + key + '" data-val="' + o[0] + '" aria-pressed="' + (state.v[key] === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }

    function buildDrawer() {
      var k = state.selected;
      if (!k) {
        drawer.hidden = true;
        drawer.innerHTML = "";
        layout();
        return;
      }
      var html = '<div class="drawer-head"><span>' + NAMES[k] + '</span><label class="mini-switch"><input type="checkbox" data-toggle="' + k + '"' +
        (state.on[k] ? " checked" : "") + '><span class="sr-only">' + NAMES[k] + ' on</span></label><button type="button" class="x" data-drawer-close aria-label="Close">×</button></div><div class="drawer-body">';
      CONTROLS[k].forEach(function (c) {
        if (c[0] === "shade") {
          html += '<div class="shades" role="group" aria-label="Lip shade">' + SHADES.map(function (s, i) {
            return '<button type="button" data-shade="' + i + '" style="background:' + s + '" aria-pressed="' + (state.v.shade === i) + '"><span class="sr-only">Shade ' + (i + 1) + "</span></button>";
          }).join("") + "</div>";
        } else if (c[0] === "bgStyle") {
          html += segmented("bgStyle", [["blur", "Blur"], ["color", "Color"], ["gradient", "Gradient"]]);
        } else if (c[0] === "presenterStyle") {
          html += segmented("presenterStyle", [["small", "Small"], ["large", "Large"]]);
          html += '<p class="note">Your screen goes in the video. Small puts you in a bubble; Large puts you in front.</p>';
        } else if (c[0] === "reactions") {
          html += '<div class="reacts">' + REACTIONS.map(function (r) {
            return '<button type="button" data-react="' + r[0] + '">' + r[1] + "</button>";
          }).join("") + '</div><p class="note">In Glow you can also hold a hand gesture, like a thumbs up or a heart.</p>';
        } else {
          html += slider(c[0], c[1]);
        }
      });
      if (k === "edge") html += '<p class="note">Lights your face from the edges of your screen. Screen sharing does not show it.</p>';
      drawer.innerHTML = html + "</div>";
      drawer.hidden = false;
      layout();
    }

    function refreshDrawerValues() {
      drawer.querySelectorAll("[data-set]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(state.v[b.dataset.set] === b.dataset.val));
      });
      drawer.querySelectorAll("[data-shade]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(state.v.shade === Number(b.dataset.shade)));
      });
      var t = drawer.querySelector("[data-toggle]");
      if (t) t.checked = !!state.on[t.dataset.toggle];
      drawer.querySelectorAll("[data-slider]").forEach(function (s) {
        s.value = Math.round(state.v[s.dataset.slider] * 100);
        drawer.querySelector('[data-pct="' + s.dataset.slider + '"]').textContent = s.value + "%";
      });
    }

    // ---------- Open and close ----------

    // The open island's height follows its content. CSS cannot animate to "auto", so measure it.
    function layout() {
      var inner = isle.querySelector(".isle-open");
      if (state.open) isle.style.height = inner.scrollHeight + "px";
    }

    function setOpen(open) {
      if (state.open === open) return;
      state.open = open;
      if (!open) {
        state.pinned = false;
        state.selected = null;
        buildDrawer();
        isle.style.height = "";
      }
      isle.classList.toggle("open", open);
      demo.classList.toggle("isle-is-open", open);
      if (open) requestAnimationFrame(layout);
      render();
    }

    var closeTimer = null, openTimer = null;
    function cancelTimers() { clearTimeout(closeTimer); clearTimeout(openTimer); closeTimer = openTimer = null; }

    if (finePointer) {
      isle.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse") return;
        clearTimeout(closeTimer);
        if (!state.open && !openTimer) openTimer = setTimeout(function () { openTimer = null; setOpen(true); }, 150);
      });
      isle.addEventListener("pointerleave", function (e) {
        if (e.pointerType !== "mouse") return;
        clearTimeout(openTimer); openTimer = null;
        if (state.open && !state.pinned) closeTimer = setTimeout(function () { setOpen(false); }, 500);
      });
    }
    // A click or tap on the closed island opens it and keeps it open.
    demo.querySelector("[data-isle-open]").addEventListener("click", function () {
      setOpen(true);
      state.pinned = true;
      render();
    });
    isle.addEventListener("pointerdown", function () {
      if (state.open && !state.pinned) { state.pinned = true; render(); }
    });
    document.addEventListener("pointerdown", function (e) {
      if (state.open && !isle.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) setOpen(false);
    });

    // ---------- Controls ----------

    isle.addEventListener("click", function (e) {
      var t = e.target;
      var look = t.closest("[data-look]");
      var effect = t.closest("[data-effect]");
      if (look) {
        state.look = look.dataset.look;
        state.filters = true;
        Object.assign(state.v, LOOKS[state.look]);
        state.on.skin = true;
        if (state.look === "glam") state.on.makeup = true;
        if (state.look === "studio") state.on.lighting = true;
        refreshDrawerValues();
      } else if (effect) {
        var k = effect.dataset.effect;
        if (state.selected === k) {
          state.selected = null;
        } else {
          state.on[k] = true;
          state.selected = k;
          if (k === "reactions") burst("hearts");
        }
        buildDrawer();
      } else if (t.closest("[data-mirror]")) {
        state.mirrored = !state.mirrored;
      } else if (t.closest("[data-pin]")) {
        state.pinned = !state.pinned;
      } else if (t.closest("[data-isle-close]") ) {
        setOpen(false);
        return;
      } else if (t.closest("[data-drawer-close]")) {
        state.selected = null;
        buildDrawer();
      } else if (t.closest("[data-set]")) {
        var b = t.closest("[data-set]");
        state.v[b.dataset.set] = b.dataset.val;
        refreshDrawerValues();
      } else if (t.closest("[data-shade]")) {
        state.v.shade = Number(t.closest("[data-shade]").dataset.shade);
        state.on.makeup = true;
        refreshDrawerValues();
      } else if (t.closest("[data-react]")) {
        burst(t.closest("[data-react]").dataset.react);
      } else {
        return;
      }
      render();
    });

    isle.addEventListener("input", function (e) {
      var t = e.target;
      if (t.dataset.slider) {
        state.v[t.dataset.slider] = t.value / 100;
        drawer.querySelector('[data-pct="' + t.dataset.slider + '"]').textContent = t.value + "%";
      } else if (t.dataset.toggle) {
        state.on[t.dataset.toggle] = t.checked;
      } else if (t.dataset.filters !== undefined) {
        state.filters = t.checked;
      } else {
        return;
      }
      render();
    });
    isle.addEventListener("change", function (e) {
      if (e.target.matches("[data-filters], [data-toggle]")) e.target.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Compare: hold to see the original. The call keeps the filtered picture.
    var compare = demo.querySelector("[data-compare]");
    function comparing(on) { state.comparing = on; compare.setAttribute("aria-pressed", String(on)); render(); }
    compare.addEventListener("pointerdown", function (e) { e.preventDefault(); comparing(true); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      compare.addEventListener(ev, function () { if (state.comparing) comparing(false); });
    });
    compare.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); comparing(true); } });
    compare.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") comparing(false); });

    // ---------- Reactions ----------

    var particles = [];
    var canvases = [previewVid.querySelector(".fx"), callVid.querySelector(".fx")];
    var running = false;

    function burst(kind) {
      if (!state.filters) return;
      var now = performance.now();
      var colors = ["#ff4d6d", "#ffd23f", "#3bceac", "#5e9bff", "#c77dff", "#ff8c42"];
      var n = { hearts: 16, thumbs: 1, balloons: 9, confetti: 70, fireworks: 3, rain: 60, lasers: 6 }[kind] || 12;
      for (var i = 0; i < n; i++) {
        var p = { kind: kind, born: now + (kind === "fireworks" ? i * 450 : kind === "rain" ? i * 25 : i * 40),
          x: Math.random(), y: 1.1, vx: (Math.random() - 0.5) * 0.08, vy: -(0.25 + Math.random() * 0.25),
          size: 0.04 + Math.random() * 0.03, color: colors[i % colors.length], spin: Math.random() * 6, life: 2.6 };
        if (kind === "thumbs") { p.x = 0.5; p.y = 0.55; p.size = 0.22; p.life = 1.6; }
        if (kind === "confetti") { p.y = -0.1; p.vy = 0.3 + Math.random() * 0.3; p.vx = (Math.random() - 0.5) * 0.2; p.size = 0.02; }
        if (kind === "rain") { p.y = -0.1; p.vy = 1.2; p.vx = -0.1; p.size = 0.05; p.life = 1.4; p.color = "#9cc8ff"; }
        if (kind === "fireworks") { p.x = 0.2 + Math.random() * 0.6; p.y = 0.25 + Math.random() * 0.25; p.life = 1.4; }
        if (kind === "lasers") { p.x = (i + 0.5) / n; p.life = 2.2; }
        particles.push(p);
      }
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    function heart(ctx, x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.3);
      ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
      ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
      ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
      ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
      ctx.fill();
    }

    function tick(now) {
      particles = particles.filter(function (p) { return (now - p.born) / 1000 < p.life; });
      canvases.forEach(function (c) {
        var r = c.getBoundingClientRect();
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
        var ctx = c.getContext("2d"), W = c.width, H = c.height;
        ctx.clearRect(0, 0, W, H);
        particles.forEach(function (p) {
          var t = (now - p.born) / 1000;
          if (t < 0) return;
          var fade = Math.min(1, (p.life - t) / 0.5);
          ctx.globalAlpha = Math.max(0, fade);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = p.color;
          var x = (p.x + p.vx * t) * W, y = (p.y + p.vy * t) * H, s = p.size * W;
          if (p.kind === "hearts") { heart(ctx, x + Math.sin(t * 3 + p.spin) * s * 0.4, y, s); }
          else if (p.kind === "balloons") {
            ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.7, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x, y + s * 0.7); ctx.lineTo(x, y + s * 1.6); ctx.lineWidth = 1; ctx.stroke();
          } else if (p.kind === "confetti") {
            ctx.save(); ctx.translate(x, y); ctx.rotate(p.spin + t * 5); ctx.fillRect(-s, -s / 2, s * 2, s); ctx.restore();
          } else if (p.kind === "rain") {
            ctx.lineWidth = Math.max(1, W / 400); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s * 0.3, y + s); ctx.stroke();
          } else if (p.kind === "fireworks") {
            var R = Math.min(1, t / 0.8) * W * 0.16;
            for (var a = 0; a < 18; a++) {
              ctx.fillStyle = ["#ffd23f", "#ff4d6d", "#5e9bff"][a % 3];
              ctx.beginPath(); ctx.arc(p.x * W + Math.cos(a / 18 * 6.283) * R, p.y * H + Math.sin(a / 18 * 6.283) * R + t * t * 20, Math.max(1.5, W / 220), 0, 7); ctx.fill();
            }
          } else if (p.kind === "lasers") {
            ctx.globalAlpha = 0.55 * fade;
            ctx.lineWidth = Math.max(2, W / 160);
            ctx.beginPath(); ctx.moveTo(p.x * W, H * 1.05); var ang = Math.sin(t * 2.2 + p.spin) * 0.6;
            ctx.lineTo(p.x * W + Math.sin(ang) * H * 1.3, -H * 0.2); ctx.stroke();
          } else if (p.kind === "thumbs") {
            var k = Math.min(1, t / 0.3);
            ctx.globalAlpha = fade;
            ctx.fillStyle = "#ffcc4d";
            ctx.beginPath(); ctx.arc(p.x * W, p.y * H - t * 18, s * 0.5 * (0.6 + 0.4 * k), 0, 7); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "600 " + Math.round(s * 0.45) + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("+1", p.x * W, p.y * H - t * 18);
          }
        });
        ctx.globalAlpha = 1;
      });
      if (particles.length) requestAnimationFrame(tick); else running = false;
    }

    // ---------- The guided tour ----------
    // Until someone moves the pointer over the Mac, a cursor opens the island and tries a few effects.

    var touring = !reduceMotion;
    var tourTimers = [];
    function stopTour() {
      if (!touring) return;
      touring = false;
      tourTimers.forEach(clearTimeout);
      ghost.classList.remove("on", "click");
      demo.classList.remove("touring");
    }
    demo.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") stopTour(); });
    demo.addEventListener("pointerdown", stopTour);
    demo.addEventListener("keydown", stopTour);

    function moveGhostTo(el, dx, dy) {
      var a = screen.getBoundingClientRect(), b = el.getBoundingClientRect();
      ghost.style.transform = "translate(" + (b.left - a.left + b.width * (dx == null ? 0.5 : dx)) + "px," + (b.top - a.top + b.height * (dy == null ? 0.5 : dy)) + "px)";
    }
    function click() { ghost.classList.add("click"); tourTimers.push(setTimeout(function () { ghost.classList.remove("click"); }, 220)); }
    function q(sel) { return demo.querySelector(sel); }

    var script = [
      [900, function () { ghost.classList.add("on"); demo.classList.add("touring"); ghost.style.transform = "translate(" + screen.clientWidth * 0.62 + "px," + screen.clientHeight * 0.7 + "px)"; }],
      [700, function () { moveGhostTo(q(".isle-closed"), 0.5, 0.6); }],
      [900, function () { setOpen(true); }],
      [1000, function () { moveGhostTo(q('[data-look="soft"]')); }],
      [700, function () { click(); q('[data-look="soft"]').click(); }],
      [1100, function () { moveGhostTo(q('[data-effect="edge"]'), 0.5, 0.3); }],
      [700, function () { click(); q('[data-effect="edge"]').click(); }],
      [1600, function () { moveGhostTo(q('[data-effect="background"]'), 0.5, 0.3); }],
      [700, function () { click(); q('[data-effect="background"]').click(); }],
      [1500, function () { moveGhostTo(q('[data-effect="reactions"]'), 0.5, 0.3); }],
      [700, function () { click(); q('[data-effect="reactions"]').click(); }],
      [1300, function () { var b = q('[data-react="confetti"]'); if (b) moveGhostTo(b); }],
      [600, function () { click(); burst("confetti"); }],
      [1700, function () { moveGhostTo(q('[data-effect="presenter"]'), 0.5, 0.3); }],
      [700, function () { click(); q('[data-effect="presenter"]').click(); }],
      [2200, function () { ghost.style.transform = "translate(" + screen.clientWidth * 0.5 + "px," + screen.clientHeight * 0.92 + "px)"; }],
      [800, function () { setOpen(false); }],
      [1600, function () {
        // Back to the start, then again.
        state.on = { skin: true }; state.look = "natural"; Object.assign(state.v, LOOKS.natural); state.v.bgStyle = "blur";
        render();
      }],
    ];

    function play() {
      if (!touring) return;
      var t = 0;
      script.forEach(function (step) {
        t += step[0];
        tourTimers.push(setTimeout(function () { if (touring) step[1](); }, t));
      });
      tourTimers.push(setTimeout(play, t + 1500));
    }

    // Effect cards on the page open the demo with their effect: window.glowIsland.show("edge").
    window.glowIsland = {
      show: function (what) {
        stopTour();
        demo.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        setTimeout(function () {
          setOpen(true);
          state.pinned = true;
          if (what.indexOf("look:") === 0) {
            state.look = what.slice(5);
            state.filters = true;
            Object.assign(state.v, LOOKS[state.look]);
            state.on.skin = true; state.on.makeup = true;
            state.selected = null;
          } else {
            state.on[what] = true;
            state.selected = what;
            if (what === "reactions") setTimeout(function () { burst("confetti"); }, 500);
          }
          buildDrawer();
          render();
        }, reduceMotion ? 0 : 650);
      },
    };

    render();
    hint.querySelector(".hint-text").textContent = finePointer ? "Point at the notch" : "Tap the notch";
    if (touring) {
      var started = false;
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && !started) { started = true; play(); }
      }, { threshold: 0.4 }).observe(demo);
    }
    window.addEventListener("resize", layout);
  }

  function start() { document.querySelectorAll("[data-island-demo]").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
