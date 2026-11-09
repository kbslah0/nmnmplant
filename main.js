/*!
 * كوكب نمنم — عالم صغير بحب كبير
 * Three.js scene + interactions. No external assets, no tracking.
 */
(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = mqReduce.matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (selector, context) {
    return (context || doc).querySelector(selector);
  };
  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || doc).querySelectorAll(selector));
  };
  var isSmall = function () {
    return window.innerWidth < 681;
  };
  var clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };

  /* ============================================================
     الصفحة تتنفس: الستارة ترفع بهدوء
     ============================================================ */

  var loader = $("#loader");
  var pageRevealed = false;

  function revealPage() {
    if (pageRevealed) return;
    pageRevealed = true;
    body.classList.add("is-ready");
    if (loader) loader.setAttribute("aria-hidden", "true");
  }

  window.setTimeout(revealPage, 2400);
  window.addEventListener("load", function () {
    window.setTimeout(revealPage, 320);
  });
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () {
      window.setTimeout(revealPage, 260);
    }).catch(function () {});
  }

  /* ============================================================
     الأغنية: «خليك معايا» — تبدأ بهدوء، وتظل معانا
     ============================================================ */

  var songEl = doc.getElementById("song");
  var soundBtn = doc.getElementById("sound-btn");
  var songPlayer = null;

  function createSongPlayer() {
    if (!songEl) return null;

    var audio = songEl;
    var started = false;
    var userPaused = false;
    var wasPlayingBeforeHide = false;

    audio.loop = true;
    audio.volume = 0.9;

    function isPlaying() {
      return !audio.paused && !audio.ended;
    }

    function syncButton() {
      if (!soundBtn) return;
      var on = isPlaying();
      soundBtn.classList.toggle("playing", on);
      soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
      soundBtn.setAttribute("aria-label", on ? "إيقاف أغنية خليك معايا" : "تشغيل أغنية خليك معايا");
    }

    function play() {
      if (isPlaying()) return Promise.resolve(true);

      var promise;
      try {
        promise = audio.play();
      } catch (error) {
        syncButton();
        return Promise.resolve(false);
      }

      return Promise.resolve(promise).then(function () {
        started = true;
        userPaused = false;
        syncButton();
        return true;
      }).catch(function () {
        syncButton();
        return false;
      });
    }

    function pause(fromUser) {
      if (fromUser) userPaused = true;
      audio.pause();
      syncButton();
    }

    audio.addEventListener("play", syncButton);
    audio.addEventListener("pause", syncButton);
    audio.addEventListener("ended", syncButton);

    return {
      play: play,
      pause: pause,
      isPlaying: isPlaying,
      syncButton: syncButton,
      get started() {
        return started;
      },
      get userPaused() {
        return userPaused;
      },
      handleHidden: function () {
        wasPlayingBeforeHide = isPlaying();
        if (wasPlayingBeforeHide) audio.pause();
      },
      handleVisible: function () {
        if (wasPlayingBeforeHide && !userPaused) play();
        wasPlayingBeforeHide = false;
      }
    };
  }

  songPlayer = createSongPlayer();

  if (soundBtn) {
    if (!songPlayer) {
      soundBtn.hidden = true;
    } else {
      soundBtn.addEventListener("click", function () {
        if (songPlayer.isPlaying()) {
          songPlayer.pause(true);
        } else {
          songPlayer.play();
        }
      });
      songPlayer.syncButton();
    }
  }

  if (songEl) {
    /* بعد ما تظهر الصفحة، نبدأ نجمع الأغنية بالخلفية بهدوء */
    window.setTimeout(function () {
      if (!songEl || songPlayer && songPlayer.isPlaying()) return;
      songEl.preload = "auto";
      try {
        songEl.load();
      } catch (error) {}
    }, 2400);

    /* محاولة سماح المتصفح: إذا سمح، الأغنية تبدأ لحالها بهدوء.
       إذا منع، أول لمسة على الكوكب أو زر الأغنية يشغّلها. */
    window.setTimeout(function () {
      if (!songPlayer || songPlayer.userPaused || songPlayer.isPlaying() || document.hidden) return;
      songPlayer.play();
    }, 3000);
  }

  /* ============================================================
     القصة: تفتح من الكوكب، وترجع للكوكب
     ============================================================ */

  var story = $("#story");
  var landing = $("#landing");
  var enterBtn = $("#enter-btn");
  var backBtn = $("#back-btn");
  var backBtn2 = $("#back-btn-2");
  var storyTitle = $("#story-title");
  var progressFill = $("#story-progress-fill");
  var storyOpen = false;
  var revealObserver = null;
  var openTimers = [];
  var scenePauseTimer = 0;
  var sceneApi = null;

  function clearOpenTimers() {
    openTimers.forEach(function (timer) {
      window.clearTimeout(timer);
    });
    openTimers = [];
    window.clearTimeout(scenePauseTimer);
  }

  function setStoryVisibleForA11y(isVisible) {
    if (!story) return;
    if (isVisible) {
      story.removeAttribute("inert");
      story.removeAttribute("aria-hidden");
    } else {
      story.setAttribute("inert", "");
      story.setAttribute("aria-hidden", "true");
    }
  }

  function setLandingVisibleForA11y(isVisible) {
    if (!landing) return;
    if (isVisible) {
      landing.removeAttribute("inert");
      landing.removeAttribute("aria-hidden");
    } else {
      landing.setAttribute("inert", "");
      landing.setAttribute("aria-hidden", "true");
    }
  }

  function updateProgress() {
    if (!story || !progressFill) return;
    var max = story.scrollHeight - story.clientHeight;
    var progress = max > 0 ? clamp(story.scrollTop / max, 0, 1) : 0;
    progressFill.style.transform = "scaleX(" + progress + ")";
  }

  function initReveals() {
    if (revealObserver) return;
    var targets = $$("[data-reveal]", story);

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("in");
      });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      root: story,
      threshold: 0.1,
      rootMargin: "0px 0px -5% 0px"
    });

    targets.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  function openStory() {
    if (storyOpen || !story) return;
    storyOpen = true;
    clearOpenTimers();

    if (sceneApi) sceneApi.zoomIn();
    if (songPlayer && !songPlayer.userPaused) songPlayer.play();
    burstHearts(window.innerWidth / 2, window.innerHeight * 0.42, 26, 1.15);

    openTimers.push(window.setTimeout(function () {
      if (!storyOpen) return;

      body.classList.add("story-open");
      setLandingVisibleForA11y(false);
      setStoryVisibleForA11y(true);
      story.scrollTop = 0;
      updateProgress();
      initReveals();

      var firstChapter = $(".chapter-arrival", story);
      if (firstChapter) {
        $$("[data-reveal]", firstChapter).forEach(function (el) {
          el.classList.add("in");
        });
      }

      if (storyTitle) {
        storyTitle.focus({ preventScroll: true });
      }

      scenePauseTimer = window.setTimeout(function () {
        if (storyOpen && sceneApi) sceneApi.pause();
      }, 1500);
    }, 420));
  }

  function closeStory() {
    if (!storyOpen || !story) return;
    storyOpen = false;
    clearOpenTimers();

    body.classList.remove("story-open");
    setStoryVisibleForA11y(false);
    setLandingVisibleForA11y(true);

    if (sceneApi) {
      sceneApi.resume();
      sceneApi.zoomOut();
    }

    if (enterBtn) {
      window.setTimeout(function () {
        if (!storyOpen) {
          story.scrollTop = 0;
          updateProgress();
          enterBtn.focus({ preventScroll: true });
        }
      }, 500);
    }
  }

  if (enterBtn) enterBtn.addEventListener("click", openStory);
  if (backBtn) backBtn.addEventListener("click", closeStory);
  if (backBtn2) backBtn2.addEventListener("click", closeStory);

  var fallbackPlanet = $(".fallback-planet");
  if (fallbackPlanet) fallbackPlanet.addEventListener("click", openStory);

  if (story) {
    var progressTick = false;
    story.addEventListener("scroll", function () {
      if (progressTick) return;
      progressTick = true;
      window.requestAnimationFrame(function () {
        progressTick = false;
        updateProgress();
      });
    }, { passive: true });
  }

  doc.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && storyOpen) {
      closeStory();
    }
  });

  /* ============================================================
     رسائل القلب
     ============================================================ */

  var notes = [
    "إنتِ أجمل شي صار بحياتي، ومو مجاملة.",
    "لو يرجع الزمن، راح أختارج مرة ثانية... وألف مرة.",
    "ضحكتج أشرف من كل نجاح بالدنيا.",
    "حتى بيومج السيئ، إنتِ أحلى إنسانة أعرفها.",
    "قلبي اختارج قبل عقلي، وهذا أذكى قرار خذه بحياته.",
    "كل ما أتخيل مستقبلي، أشوفج بيه. بكل غرفة، وبكل صباح.",
    "إنتِ مو حاجة بحياتي... إنتِ الحياة نفسها.",
    "تعبج مو مخفي عني. وأنا وياج، مو بس بالكلام.",
    "إذا الليلة ثقيلة، خلي قلبي هوه المخدة.",
    "أحبج اليوم أكثر من أمس، وأقل من بكرة. وهكذا دواماً.",
    "الدبدوب الصغير اللي بهذا الكوكب؟ وصّيتة يحرسج... بس أني اللي أحبج أكثر.",
    "ما عندي وعد أكبر من وعد: إني أظل وياج. والباقي، يهون."
  ];

  var noteText = $("#note-text");
  var noteBtn = $("#note-btn");
  var noteIndex = 0;
  var noteTimer = 0;

  if (noteBtn && noteText) {
    noteBtn.addEventListener("click", function () {
      var nextIndex = noteIndex;
      if (notes.length > 1) {
        while (nextIndex === noteIndex) {
          nextIndex = Math.floor(Math.random() * notes.length);
        }
      }
      noteIndex = nextIndex;
      burstFromElement(noteBtn, 10);

      window.clearTimeout(noteTimer);
      if (reduceMotion) {
        noteText.textContent = notes[noteIndex];
        return;
      }

      noteText.classList.add("swap");
      noteTimer = window.setTimeout(function () {
        noteText.textContent = notes[noteIndex];
        noteText.classList.remove("swap");
      }, 240);
    });
  }

  /* ============================================================
     قلوب تتطاير — لحظة صغيرة، مو أكثر
     ============================================================ */

  var HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z";

  function burstHearts(x, y, count, spread) {
    if (reduceMotion || !doc.body || typeof Element === "undefined" || !Element.prototype.animate) return;

    var colors = ["#ffd6e9", "#ffe1ef", "#d9c5ff", "#ffe6a6", "#fff8ff"];
    var amount = count || 14;
    var strength = spread || 1;

    for (var i = 0; i < amount; i += 1) {
      var heart = doc.createElement("span");
      heart.className = "burst-heart";
      heart.style.color = colors[i % colors.length];
      heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + HEART_PATH + '"/></svg>';

      var size = 8 + Math.random() * 12;
      var angle = Math.random() * Math.PI * 2;
      var distance = (42 + Math.random() * 130) * strength;
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance - 34;
      var rotation = Math.random() * 160 - 80;
      var duration = 900 + Math.random() * 750;

      heart.style.left = x + "px";
      heart.style.top = y + "px";
      heart.style.width = size + "px";
      heart.style.height = size + "px";

      doc.body.appendChild(heart);

      var animation = heart.animate([
        {
          transform: "translate(-50%, -50%) scale(0.35) rotate(0deg)",
          opacity: 0
        },
        {
          transform: "translate(calc(-50% + " + dx * 0.28 + "px), calc(-50% + " + dy * 0.28 + "px)) scale(1) rotate(" + rotation * 0.4 + "deg)",
          opacity: 1,
          offset: 0.16
        },
        {
          transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(0.65) rotate(" + rotation + "deg)",
          opacity: 0
        }
      ], {
        duration: duration,
        easing: "cubic-bezier(0.16, 0.84, 0.44, 1)"
      });

      animation.onfinish = function (element) {
        return function () {
          if (element.parentNode) element.parentNode.removeChild(element);
        };
      }(heart);
    }
  }

  function burstFromElement(element, count) {
    if (!element) return;
    var rect = element.getBoundingClientRect();
    burstHearts(rect.left + rect.width / 2, rect.top + rect.height / 2, count, 0.8);
  }

  /* ============================================================
     وهج يتبع المؤشر — على الشاشات الكبيرة فقط
     ============================================================ */

  function initCursorGlow() {
    if (!finePointer || reduceMotion) return;
    var glow = $("#cursor-glow");
    if (!glow) return;

    body.classList.add("has-pointer");

    var targetX = window.innerWidth / 2;
    var targetY = window.innerHeight / 2;
    var currentX = targetX;
    var currentY = targetY;
    var raf = 0;

    glow.style.transform = "translate3d(" + (currentX - 270) + "px, " + (currentY - 270) + "px, 0)";

    function tick() {
      currentX += (targetX - currentX) * 0.13;
      currentY += (targetY - currentY) * 0.13;
      glow.style.transform = "translate3d(" + (currentX - 270) + "px, " + (currentY - 270) + "px, 0)";

      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.5) {
        raf = window.requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }

    window.addEventListener("pointermove", function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!raf) raf = window.requestAnimationFrame(tick);
    }, { passive: true });
  }

  /* ============================================================
     المشهد: كوكب من قلوب، ومدار صغير لدبدوب
     ============================================================ */

  function createScene(onEnter) {
    if (typeof THREE === "undefined") return null;

    var canvas = $("#scene");
    if (!canvas) return null;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch (error) {
      return null;
    }

    if (!renderer || !renderer.getContext()) return null;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    var world = new THREE.Group();
    scene.add(world);

    var baseZ = 8.6;
    var planetY = 0.78;
    var zoomed = false;
    var running = false;
    var rafId = 0;
    var lastFrame = 0;
    var time = 0;
    var hover = 0;
    var hoverTarget = 0;
    var pointerX = 0;
    var pointerY = 0;
    var smoothX = 0;
    var smoothY = 0;
    var reduce = reduceMotion;

    function dpr() {
      return Math.min(window.devicePixelRatio || 1, isSmall() ? 1.6 : 2);
    }

    function measure() {
      var width = window.innerWidth;
      var height = window.innerHeight;
      var mobile = width < 681;
      var z = 8.6;

      if (height < 640 && width > height) {
        z = 10.2;
      } else if (mobile) {
        z = 10.5;
      } else if (height < 820) {
        z = 9.4;
      } else if (width / height < 1.05) {
        z = 9.6;
      }

      baseZ = z;
      planetY = 0.78;
      world.position.y = planetY;
    }

    renderer.setPixelRatio(dpr());
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);
    measure();

    camera.position.set(0, 0, baseZ);
    camera.lookAt(0, 0, 0);

    /* ---------- نسيج واحد لكل شيء ---------- */

    function makeTexture(size, painter) {
      var textureCanvas = doc.createElement("canvas");
      textureCanvas.width = size;
      textureCanvas.height = size;
      var context = textureCanvas.getContext("2d");
      painter(context, size);
      var texture = new THREE.CanvasTexture(textureCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      return texture;
    }

    var heartTexture = makeTexture(128, function (context, size) {
      var s = size;
      context.clearRect(0, 0, s, s);
      context.save();
      context.shadowColor = "rgba(255,255,255,0.95)";
      context.shadowBlur = s * 0.13;
      context.fillStyle = "#fff";
      context.beginPath();
      context.moveTo(s * 0.5, s * 0.82);
      context.bezierCurveTo(s * 0.13, s * 0.55, s * 0.08, s * 0.31, s * 0.24, s * 0.21);
      context.bezierCurveTo(s * 0.36, s * 0.12, s * 0.47, s * 0.18, s * 0.5, s * 0.29);
      context.bezierCurveTo(s * 0.53, s * 0.18, s * 0.64, s * 0.12, s * 0.76, s * 0.21);
      context.bezierCurveTo(s * 0.92, s * 0.31, s * 0.87, s * 0.55, s * 0.5, s * 0.82);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fill();
      context.restore();
    });

    var dotTexture = makeTexture(64, function (context, size) {
      var half = size / 2;
      var gradient = context.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.22, "rgba(255,255,255,0.8)");
      gradient.addColorStop(0.55, "rgba(255,255,255,0.16)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    });

    var haloTexture = makeTexture(256, function (context, size) {
      var half = size / 2;
      var gradient = context.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(0.16, "rgba(255,255,255,0.5)");
      gradient.addColorStop(0.42, "rgba(255,255,255,0.14)");
      gradient.addColorStop(0.7, "rgba(255,255,255,0.035)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    });

    /* ---------- نجوم ---------- */

    var starCount = isSmall() ? 800 : 1500;
    var starGeometry = new THREE.BufferGeometry();
    var starPositions = new Float32Array(starCount * 3);
    var starColors = new Float32Array(starCount * 3);
    var starSizes = new Float32Array(starCount);
    var starPhases = new Float32Array(starCount);
    var starPalette = ["#fff8ff", "#ffd6e9", "#d9c5ff", "#ffe6a6", "#e6d5ed"];
    var paletteColor = new THREE.Color();

    for (var i = 0; i < starCount; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 80;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 55;
      starPositions[i * 3 + 2] = -8 - Math.random() * 42;
      paletteColor.set(starPalette[Math.floor(Math.random() * starPalette.length)]);
      starColors[i * 3] = paletteColor.r;
      starColors[i * 3 + 1] = paletteColor.g;
      starColors[i * 3 + 2] = paletteColor.b;
      starSizes[i] = 0.045 + Math.pow(Math.random(), 3) * 0.16;
      starPhases[i] = Math.random() * Math.PI * 2;
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("aColor", new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute("aPhase", new THREE.BufferAttribute(starPhases, 1));

    var starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFocal: { value: 1000 }
      },
      vertexShader: [
        "attribute float aSize;",
        "attribute float aPhase;",
        "attribute vec3 aColor;",
        "uniform float uTime;",
        "uniform float uFocal;",
        "varying vec3 vColor;",
        "varying float vAlpha;",
        "void main() {",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  gl_Position = projectionMatrix * mv;",
        "  gl_PointSize = aSize * uFocal / max(-mv.z, 0.1);",
        "  vColor = aColor;",
        "  vAlpha = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * 0.9 + aPhase), 2.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vColor;",
        "varying float vAlpha;",
        "void main() {",
        "  float distanceToCenter = length(gl_PointCoord - vec2(0.5));",
        "  if (distanceToCenter > 0.5) discard;",
        "  float alpha = smoothstep(0.5, 0.04, distanceToCenter);",
        "  gl_FragColor = vec4(vColor, alpha * vAlpha * 0.95);",
        "}"
      ].join("\n"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    var starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    /* ---------- سُحب بعيدة، بلون الحب ---------- */

    var nebulae = [
      { x: -9, y: 4, z: -18, scale: 18, color: 0x63365e, opacity: 0.26 },
      { x: 10, y: -4, z: -22, scale: 22, color: 0x573b75, opacity: 0.22 },
      { x: 2, y: 6, z: -30, scale: 28, color: 0x302044, opacity: 0.4 },
      { x: -12, y: -6, z: -12, scale: 13, color: 0xffd6e9, opacity: 0.07 }
    ];

    nebulae.forEach(function (nebula) {
      var material = new THREE.SpriteMaterial({
        map: haloTexture,
        color: nebula.color,
        transparent: true,
        opacity: nebula.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      var sprite = new THREE.Sprite(material);
      sprite.position.set(nebula.x, nebula.y, nebula.z);
      sprite.scale.set(nebula.scale, nebula.scale, 1);
      scene.add(sprite);
    });

    /* ---------- هالة الكوكب ---------- */

    var halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xffc2dc,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    halo.position.set(0, 0.1, -0.7);
    halo.scale.set(6.2, 6.2, 1);
    world.add(halo);

    var outerHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0x8a5ca8,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    outerHalo.position.set(0, 0, -2.2);
    outerHalo.scale.set(10, 10, 1);
    world.add(outerHalo);

    /* ---------- قشرة القلوب ---------- */

    var heartCount = isSmall() ? 430 : 760;
    var heartGeometry = new THREE.BufferGeometry();
    var heartPositions = new Float32Array(heartCount * 3);
    var heartColors = new Float32Array(heartCount * 3);
    var heartSizes = new Float32Array(heartCount);
    var heartPhases = new Float32Array(heartCount);
    var heartPalette = ["#ffd6e9", "#ffe1ef", "#d9c5ff", "#ffe6a6", "#ffb7d6", "#fff8ff"];
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (var h = 0; h < heartCount; h += 1) {
      var y = 1 - (h / (heartCount - 1)) * 2;
      var radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      var theta = goldenAngle * h;
      var shellRadius = 1.57 + Math.random() * 0.3;

      heartPositions[h * 3] = Math.cos(theta) * radiusAtY * shellRadius;
      heartPositions[h * 3 + 1] = y * shellRadius;
      heartPositions[h * 3 + 2] = Math.sin(theta) * radiusAtY * shellRadius;

      paletteColor.set(heartPalette[Math.floor(Math.random() * heartPalette.length)]);
      heartColors[h * 3] = paletteColor.r;
      heartColors[h * 3 + 1] = paletteColor.g;
      heartColors[h * 3 + 2] = paletteColor.b;
      heartSizes[h] = 0.03 + Math.pow(Math.random(), 2.2) * 0.078;
      heartPhases[h] = Math.random() * Math.PI * 2;
    }

    heartGeometry.setAttribute("position", new THREE.BufferAttribute(heartPositions, 3));
    heartGeometry.setAttribute("aColor", new THREE.BufferAttribute(heartColors, 3));
    heartGeometry.setAttribute("aSize", new THREE.BufferAttribute(heartSizes, 1));
    heartGeometry.setAttribute("aPhase", new THREE.BufferAttribute(heartPhases, 1));

    var heartMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: heartTexture },
        uTime: { value: 0 },
        uFocal: { value: 1000 },
        uOpacity: { value: 0.92 }
      },
      vertexShader: [
        "attribute float aSize;",
        "attribute float aPhase;",
        "attribute vec3 aColor;",
        "uniform float uTime;",
        "uniform float uFocal;",
        "varying vec3 vColor;",
        "varying float vTwinkle;",
        "void main() {",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  gl_Position = projectionMatrix * mv;",
        "  gl_PointSize = aSize * uFocal / max(-mv.z, 0.1);",
        "  vColor = aColor;",
        "  vTwinkle = 0.55 + 0.45 * sin(uTime * 1.2 + aPhase);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D uMap;",
        "uniform float uOpacity;",
        "varying vec3 vColor;",
        "varying float vTwinkle;",
        "void main() {",
        "  vec4 textureColor = texture2D(uMap, gl_PointCoord);",
        "  float alpha = textureColor.a * uOpacity * (0.7 + 0.3 * vTwinkle);",
        "  gl_FragColor = vec4(vColor * textureColor.rgb, alpha);",
        "}"
      ].join("\n"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    var heartShell = new THREE.Points(heartGeometry, heartMaterial);
    heartShell.rotation.x = 0.18;
    heartShell.rotation.z = -0.1;
    world.add(heartShell);

    /* ---------- الكوكب نفسه ---------- */

    var planetUniforms = {
      uTime: { value: 0 },
      uHover: { value: 0 }
    };

    var planetMaterial = new THREE.ShaderMaterial({
      uniforms: planetUniforms,
      vertexShader: [
        "uniform float uTime;",
        "uniform float uHover;",
        "varying vec3 vNormal;",
        "varying vec3 vView;",
        "varying vec3 vPos;",
        "void main() {",
        "  vNormal = normalize(normalMatrix * normal);",
        "  vPos = position;",
        "  vec3 displaced = position;",
        "  float wobble = sin(position.y * 3.3 + uTime * 0.55) * 0.011 + sin(position.x * 2.4 - uTime * 0.41) * 0.009;",
        "  displaced += normal * wobble * (1.0 + uHover * 0.55);",
        "  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);",
        "  vView = -mv.xyz;",
        "  gl_Position = projectionMatrix * mv;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTime;",
        "uniform float uHover;",
        "varying vec3 vNormal;",
        "varying vec3 vView;",
        "varying vec3 vPos;",

        "float hash(vec3 p) {",
        "  p = fract(p * 0.3183099 + vec3(0.1, 0.13, 0.17));",
        "  p *= 17.0;",
        "  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));",
        "}",

        "float noise3(vec3 x) {",
        "  vec3 i = floor(x);",
        "  vec3 f = fract(x);",
        "  f = f * f * (3.0 - 2.0 * f);",
        "  return mix(",
        "    mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),",
        "        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),",
        "    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),",
        "        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);",
        "}",

        "float fbm(vec3 p) {",
        "  float value = 0.0;",
        "  float amplitude = 0.5;",
        "  for (int octave = 0; octave < 5; octave++) {",
        "    value += amplitude * noise3(p);",
        "    p *= 2.03;",
        "    amplitude *= 0.5;",
        "  }",
        "  return value;",
        "}",

        "void main() {",
        "  vec3 n = normalize(vNormal);",
        "  vec3 viewDirection = normalize(vView);",
        "  vec3 surface = normalize(vPos);",
        "  float flow = fbm(surface * 2.15 + vec3(uTime * 0.045, uTime * 0.026, -uTime * 0.034));",
        "  float swirl = fbm(surface * 3.7 + flow * 1.75 + vec3(0.0, uTime * 0.02, 0.0));",
        "  vec3 deep = vec3(0.21, 0.14, 0.3);",
        "  vec3 roseDeep = vec3(0.44, 0.235, 0.42);",
        "  vec3 lightRose = vec3(1.0, 0.74, 0.88);",
        "  vec3 gold = vec3(1.0, 0.91, 0.66);",
        "  vec3 color = mix(deep, roseDeep, smoothstep(0.2, 0.8, flow));",
        "  color = mix(color, lightRose, smoothstep(0.5, 0.9, swirl) * 0.58);",
        "  color = mix(color, gold, smoothstep(0.6, 0.95, flow * swirl + 0.27) * 0.42);",
        "  float bands = sin(vPos.y * 5.0 + flow * 2.0 + uTime * 0.12) * 0.5 + 0.5;",
        "  color += vec3(1.0, 0.82, 0.9) * bands * 0.038;",
        "  vec3 lightDirection = normalize(vec3(-0.45, 0.65, 0.7));",
        "  float lambert = clamp(dot(n, lightDirection), 0.0, 1.0);",
        "  color *= 0.52 + 0.78 * lambert;",
        "  float fresnel = pow(1.0 - max(dot(n, viewDirection), 0.0), 2.5);",
        "  color += vec3(1.0, 0.72, 0.86) * fresnel * (0.55 + uHover * 0.45);",
        "  color += gold * pow(fresnel, 3.0) * 0.5;",
        "  vec3 halfDirection = normalize(lightDirection + viewDirection);",
        "  float specular = pow(max(dot(n, halfDirection), 0.0), 28.0);",
        "  color += vec3(1.0, 0.9, 0.96) * specular * 0.26;",
        "  gl_FragColor = vec4(color, 1.0);",
        "}"
      ].join("\n")
    });

    var planet = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, isSmall() ? 72 : 96, isSmall() ? 72 : 96),
      planetMaterial
    );
    planet.rotation.set(0.14, 0.4, -0.08);
    world.add(planet);

    var atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.59, 64, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: [
          "varying vec3 vNormal;",
          "varying vec3 vView;",
          "void main() {",
          "  vNormal = normalize(normalMatrix * normal);",
          "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
          "  vView = -mv.xyz;",
          "  gl_Position = projectionMatrix * mv;",
          "}"
        ].join("\n"),
        fragmentShader: [
          "varying vec3 vNormal;",
          "varying vec3 vView;",
          "void main() {",
          "  vec3 n = normalize(vNormal);",
          "  vec3 v = normalize(vView);",
          "  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);",
          "  gl_FragColor = vec4(1.0, 0.73, 0.86, fresnel * 0.5);",
          "}"
        ].join("\n")
      })
    );
    world.add(atmosphere);

    var hitTarget = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 16, 16),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false
      })
    );
    world.add(hitTarget);

    /* ---------- مدارات من غبار وذهب ---------- */

    var ringGroup = new THREE.Group();
    ringGroup.rotation.x = 1.08;
    ringGroup.rotation.z = 0.2;
    world.add(ringGroup);

    function addDustRing(radius, count, color, size, opacity) {
      var geometry = new THREE.BufferGeometry();
      var positions = new Float32Array(count * 3);

      for (var index = 0; index < count; index += 1) {
        var angle = Math.random() * Math.PI * 2;
        var band = radius + (Math.random() - 0.5) * 0.075;
        positions[index * 3] = Math.cos(angle) * band;
        positions[index * 3 + 1] = Math.sin(angle) * band;
        positions[index * 3 + 2] = (Math.random() - 0.5) * 0.04;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      var material = new THREE.PointsMaterial({
        color: color,
        size: size,
        map: dotTexture,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      var points = new THREE.Points(geometry, material);
      ringGroup.add(points);
    }

    addDustRing(2.35, isSmall() ? 260 : 420, 0xffd6e9, 0.038, 0.74);
    addDustRing(2.62, isSmall() ? 160 : 260, 0xffe6a6, 0.032, 0.6);
    addDustRing(2.95, isSmall() ? 120 : 190, 0xd9c5ff, 0.028, 0.42);

    var thinRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.62, 0.004, 4, 240),
      new THREE.MeshBasicMaterial({
        color: 0xffe6a6,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    ringGroup.add(thinRing);

    var thinRingTwo = new THREE.Mesh(
      new THREE.TorusGeometry(2.34, 0.003, 4, 220),
      new THREE.MeshBasicMaterial({
        color: 0xffd6e9,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    ringGroup.add(thinRingTwo);

    /* ---------- إضاءة ناعمة للدبدوب ---------- */

    scene.add(new THREE.AmbientLight(0xffe9f5, 0.62));

    var keyLight = new THREE.DirectionalLight(0xfff2f9, 0.95);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    var fillLight = new THREE.DirectionalLight(0xffd6e9, 0.42);
    fillLight.position.set(-6, 2, 5);
    scene.add(fillLight);

    var rimLight = new THREE.DirectionalLight(0xffe6a6, 0.58);
    rimLight.position.set(0, 4, -7);
    scene.add(rimLight);

    /* ---------- دبدوب نمنم ---------- */

    var teddy = new THREE.Group();
    var teddySphere = new THREE.SphereGeometry(1, 20, 16);

    var furMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4dac7,
      roughness: 0.92,
      metalness: 0
    });
    var innerEarMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb9ce,
      roughness: 0.98,
      metalness: 0
    });
    var muzzleMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff0e4,
      roughness: 0.98,
      metalness: 0
    });
    var eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b1b38,
      roughness: 0.3,
      metalness: 0.05
    });
    var noseMaterial = new THREE.MeshStandardMaterial({
      color: 0xb75d7e,
      roughness: 0.5,
      metalness: 0.02
    });
    var scarfMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc9dd,
      roughness: 0.9,
      metalness: 0
    });
    var goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe6a6,
      roughness: 0.5,
      metalness: 0.15
    });

    function teddyPart(geometry, material, x, y, z, scaleX, scaleY, scaleZ, rotationX, rotationY, rotationZ) {
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(scaleX, scaleY, scaleZ);
      mesh.rotation.set(rotationX || 0, rotationY || 0, rotationZ || 0);
      teddy.add(mesh);
      return mesh;
    }

    teddyPart(teddySphere, furMaterial, 0, -0.06, 0, 0.46, 0.52, 0.4);
    teddyPart(teddySphere, furMaterial, 0, 0.55, 0.02, 0.37, 0.35, 0.34);
    teddyPart(teddySphere, furMaterial, 0.29, 0.82, 0, 0.16, 0.16, 0.11);
    teddyPart(teddySphere, furMaterial, -0.29, 0.82, 0, 0.16, 0.16, 0.11);
    teddyPart(teddySphere, innerEarMaterial, 0.29, 0.82, 0.09, 0.09, 0.09, 0.04);
    teddyPart(teddySphere, innerEarMaterial, -0.29, 0.82, 0.09, 0.09, 0.09, 0.04);

    teddyPart(teddySphere, furMaterial, 0.44, 0.04, 0.04, 0.17, 0.27, 0.16, 0, 0, -0.5);
    teddyPart(teddySphere, furMaterial, -0.44, 0.04, 0.04, 0.17, 0.27, 0.16, 0, 0, 0.5);
    teddyPart(teddySphere, furMaterial, 0.22, -0.5, 0.08, 0.2, 0.17, 0.24, 0.2, 0, 0.1);
    teddyPart(teddySphere, furMaterial, -0.22, -0.5, 0.08, 0.2, 0.17, 0.24, 0.2, 0, -0.1);
    teddyPart(teddySphere, innerEarMaterial, 0.22, -0.49, 0.3, 0.09, 0.07, 0.035);
    teddyPart(teddySphere, innerEarMaterial, -0.22, -0.49, 0.3, 0.09, 0.07, 0.035);

    teddyPart(teddySphere, muzzleMaterial, 0, 0.48, 0.3, 0.17, 0.13, 0.1);
    teddyPart(teddySphere, noseMaterial, 0, 0.52, 0.39, 0.055, 0.045, 0.04);
    teddyPart(teddySphere, eyeMaterial, 0.13, 0.62, 0.31, 0.04, 0.045, 0.03);
    teddyPart(teddySphere, eyeMaterial, -0.13, 0.62, 0.31, 0.04, 0.045, 0.03);

    var scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.275, 0.052, 10, 30),
      scarfMaterial
    );
    scarf.position.set(0, 0.28, 0.01);
    scarf.rotation.x = Math.PI / 2;
    teddy.add(scarf);

    var charm = new THREE.Mesh(teddySphere, goldMaterial);
    charm.position.set(0, 0.25, 0.29);
    charm.scale.set(0.045, 0.045, 0.045);
    teddy.add(charm);

    var heldHeart = new THREE.Sprite(new THREE.SpriteMaterial({
      map: heartTexture,
      color: 0xffa9c8,
      transparent: true,
      opacity: 0.96,
      depthWrite: false
    }));
    heldHeart.position.set(0, 0.02, 0.44);
    heldHeart.scale.set(0.38, 0.38, 1);
    teddy.add(heldHeart);

    var teddyGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xffc2dc,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    teddyGlow.position.set(0, 0.15, -0.5);
    teddyGlow.scale.set(1.7, 1.7, 1);
    teddy.add(teddyGlow);

    var teddyLight = new THREE.PointLight(0xffe4f0, 0.35, 5, 2);
    teddyLight.position.set(0.8, 1.1, 1.6);
    teddy.add(teddyLight);

    teddy.scale.setScalar(isSmall() ? 0.3 : 0.38);
    world.add(teddy);

    /* ---------- مؤشر اللمس على الكوكب ---------- */

    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var downX = 0;
    var downY = 0;
    var downTime = 0;

    function hitPlanet(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(hitTarget, false).length > 0;
    }

    canvas.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointerX = clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
      pointerY = clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1);

      if (finePointer && !zoomed) {
        var isOverPlanet = hitPlanet(event.clientX, event.clientY);
        hoverTarget = isOverPlanet ? 1 : 0;
        canvas.classList.toggle("is-hot", isOverPlanet);
      }
    }, { passive: true });

    canvas.addEventListener("pointerdown", function (event) {
      downX = event.clientX;
      downY = event.clientY;
      downTime = window.performance.now();
    }, { passive: true });

    canvas.addEventListener("pointerup", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      var distance = Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY);
      var elapsed = window.performance.now() - downTime;
      if (distance > 14 || elapsed > 1000) return;
      if (hitPlanet(event.clientX, event.clientY)) {
        hoverTarget = 0;
        canvas.classList.remove("is-hot");
        onEnter();
      }
    }, { passive: true });

    canvas.addEventListener("pointerleave", function () {
      pointerX = 0;
      pointerY = 0;
      hoverTarget = 0;
      canvas.classList.remove("is-hot");
    }, { passive: true });

    /* ---------- المقاسات، الضوء، والدوران ---------- */

    function updateSizes() {
      var width = window.innerWidth;
      var height = window.innerHeight;
      renderer.setPixelRatio(dpr());
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      var focal = (renderer.domElement.height * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
      starMaterial.uniforms.uFocal.value = focal;
      heartMaterial.uniforms.uFocal.value = focal;

      measure();

      if (reduce) {
        camera.position.z = zoomed ? baseZ * 0.64 : baseZ;
      }
    }

    function updateTeddy(t) {
      var orbitRadius = isSmall() ? 1.62 : 2.5;
      var angle = 0.62 + t * 0.105;
      var tilt = 0.34;
      var x = Math.cos(angle) * orbitRadius;
      var z = Math.sin(angle) * orbitRadius * Math.cos(tilt);
      var y = -Math.sin(angle) * orbitRadius * Math.sin(tilt) + 0.18 + Math.sin(t * 0.8) * 0.035;

      teddy.position.set(x, y, z);
      teddy.lookAt(camera.position);
      teddy.rotateZ(Math.sin(t * 0.72) * 0.055);
    }

    function animateFrame(now) {
      if (!running) return;
      rafId = window.requestAnimationFrame(animateFrame);

      if (!lastFrame) lastFrame = now;
      var delta = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      time += delta;

      var t = reduce ? 18.0 : time;
      var targetZ = zoomed ? baseZ * 0.64 : baseZ;
      var cameraEase = reduce ? 1 : 1 - Math.exp(-3.1 * delta);
      camera.position.z += (targetZ - camera.position.z) * cameraEase;

      var targetParallaxX = (reduce || zoomed) ? 0 : pointerX;
      var targetParallaxY = (reduce || zoomed) ? 0 : pointerY;
      var parallaxEase = 1 - Math.exp(-3.4 * delta);
      smoothX += (targetParallaxX - smoothX) * parallaxEase;
      smoothY += (targetParallaxY - smoothY) * parallaxEase;

      camera.position.x = smoothX * 0.34;
      camera.position.y = smoothY * 0.16;
      camera.lookAt(0, 0, 0);

      hover += (hoverTarget - hover) * (1 - Math.exp(-7.5 * delta));
      planetUniforms.uHover.value = hover;
      planet.scale.setScalar(1 + hover * 0.024);

      planet.rotation.y = 0.4 + t * 0.045;
      heartShell.rotation.y = -t * 0.038;
      heartShell.rotation.x = 0.18 + Math.sin(t * 0.13) * 0.035;
      ringGroup.rotation.z = 0.2 + Math.sin(t * 0.08) * 0.02;
      ringGroup.rotation.x = 1.08 + Math.sin(t * 0.06) * 0.015;

      world.position.y = planetY + (reduce ? 0 : Math.sin(t * 0.48) * 0.02);

      planetUniforms.uTime.value = t;
      heartMaterial.uniforms.uTime.value = t;
      starMaterial.uniforms.uTime.value = t;

      hoverTarget = zoomed ? 0 : hoverTarget;
      halo.material.opacity = 0.5 + hover * 0.08;
      updateTeddy(t);

      renderer.render(scene, camera);
    }

    function startLoop() {
      if (running || doc.hidden) return;
      running = true;
      lastFrame = 0;
      rafId = window.requestAnimationFrame(animateFrame);
    }

    function stopLoop() {
      running = false;
      window.cancelAnimationFrame(rafId);
    }

    updateSizes();
    startLoop();

    window.addEventListener("resize", function () {
      updateSizes();
      if (!running) {
        // إذا كنا واقفين، نرسم إطار ثابت عشان الكوكب يظل مرتب بعد تغيير المقاس
        renderer.render(scene, camera);
      }
    });

    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) {
        stopLoop();
      } else if (!body.classList.contains("story-open")) {
        startLoop();
      }
    });

    if (mqReduce.addEventListener) {
      mqReduce.addEventListener("change", function (event) {
        reduce = event.matches;
        reduceMotion = event.matches;
        if (reduce) {
          camera.position.z = zoomed ? baseZ * 0.64 : baseZ;
        }
      });
    }

    return {
      zoomIn: function () {
        zoomed = true;
        pointerX = 0;
        pointerY = 0;
        hoverTarget = 0;
        canvas.classList.remove("is-hot");
        startLoop();
        if (reduce) camera.position.z = baseZ * 0.64;
      },
      zoomOut: function () {
        zoomed = false;
        startLoop();
        if (reduce) camera.position.z = baseZ;
      },
      pause: function () {
        stopLoop();
      },
      resume: function () {
        if (!body.classList.contains("story-open")) startLoop();
      }
    };
  }

  /* ============================================================
     التشغيل
     ============================================================ */

  initCursorGlow();

  try {
    if (typeof THREE !== "undefined") {
      sceneApi = createScene(openStory);
    }
  } catch (error) {
    sceneApi = null;
    if (window.console && window.console.warn) {
      window.console.warn("تعذّر تشغيل مشهد الكوكب، وراح يظهر الكوكب البديل.", error);
    }
  }

  if (!sceneApi) {
    body.classList.add("no-webgl");
  }

  document.addEventListener("visibilitychange", function () {
    if (!songPlayer) return;
    if (document.hidden) {
      songPlayer.handleHidden();
    } else {
      songPlayer.handleVisible();
    }
  });

  /* ---------- لقطات التصميم فقط ---------- */
  if (/[?&]snap\b/.test(window.location.search)) {
    body.classList.add("is-ready");

    var snapParams = new URLSearchParams(window.location.search);
    if (snapParams.get("view") === "story") {
      window.setTimeout(function () {
        openStory();

        window.setTimeout(function () {
          var at = snapParams.get("at");
          var targets = {
            letter: "chapter-letter",
            truths: "chapter-truths",
            promises: "chapter-promises",
            message: "chapter-note",
            final: "chapter-final"
          };
          var id = targets[at];
          var target = id ? doc.getElementById(id) : null;
          if (!target || !story) return;

          var chapter = target.closest(".chapter") || target;
          var top = chapter.getBoundingClientRect().top - story.getBoundingClientRect().top + story.scrollTop - 64;
          story.scrollTop = Math.max(0, top);
          updateProgress();
        }, 950);
      }, 260);
    }
  }
})();
