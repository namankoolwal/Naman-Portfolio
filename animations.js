'use strict';

// =====================================================================
// NAMAN PORTFOLIO — 3D Interactive Experience
// Libraries: Three.js, GSAP + ScrollTrigger, Lenis, VanillaTilt
// =====================================================================

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger);

// ===================== PAGE LOADER =====================
window.addEventListener('load', function () {
  var loader = document.querySelector('.page-loader');
  if (loader) {
    setTimeout(function () {
      loader.style.opacity = '0';
      setTimeout(function () { loader.remove(); }, 700);
    }, 400);
  }
});

// ===================== LENIS SMOOTH SCROLL =====================
var lenis = new Lenis({
  duration: 1.2,
  // 1.001 (not exactly 1) prevents the easing from reaching 0 too fast, giving a smoother stop
  easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
  smoothWheel: true
});

gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

// ===================== SCROLL PROGRESS BAR =====================
var progressBar = document.querySelector('.scroll-progress');
if (progressBar) {
  gsap.set(progressBar, { scaleX: 0, transformOrigin: 'left center' });
  gsap.to(progressBar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3
    }
  });
}

// ===================== THREE.JS PARTICLE NETWORK BACKGROUND =====================
(function initThree() {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
  // Cap pixel ratio at 1.5 to avoid performance issues on high-DPI displays
  var MAX_PIXEL_RATIO = 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.z = 40;

  // --- Particles ---
  var PARTICLE_COUNT = 90;
  var PARTICLE_SPREAD = 32;
  var pos = new Float32Array(PARTICLE_COUNT * 3);
  var vel = new Float32Array(PARTICLE_COUNT * 2);

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * PARTICLE_SPREAD * 2;
    pos[i * 3 + 1] = (Math.random() - 0.5) * PARTICLE_SPREAD * 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    vel[i * 2]     = (Math.random() - 0.5) * 0.007;
    vel[i * 2 + 1] = (Math.random() - 0.5) * 0.007;
  }

  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  var pMat = new THREE.PointsMaterial({
    size: 0.28,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0x6688ff
  });

  var points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // --- Connecting lines ---
  var MAX_LINES = PARTICLE_COUNT * 3;
  var lBuf = new Float32Array(MAX_LINES * 6);
  var lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lBuf, 3));
  lGeo.setDrawRange(0, 0);

  var lMat = new THREE.LineBasicMaterial({
    color: 0x9955cc,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  var lineSegs = new THREE.LineSegments(lGeo, lMat);
  scene.add(lineSegs);

  // --- Mouse parallax ---
  var mx = 0, my = 0, camX = 0, camY = 0;
  document.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = -(e.clientY / window.innerHeight - 0.5);
  });

  var frame = 0;
  // Maximum distance for two particles to draw a connecting line
  var MAX_CONNECT_DIST = 12;

  function tick() {
    requestAnimationFrame(tick);

    // Move particles and bounce off virtual walls
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3]     += vel[i * 2];
      pos[i * 3 + 1] += vel[i * 2 + 1];
      if (Math.abs(pos[i * 3])     > PARTICLE_SPREAD) vel[i * 2]     *= -1;
      if (Math.abs(pos[i * 3 + 1]) > PARTICLE_SPREAD) vel[i * 2 + 1] *= -1;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Update lines every 5 frames
    if (frame % 5 === 0) {
      var lc = 0;
      for (var i = 0; i < PARTICLE_COUNT && lc < MAX_LINES; i++) {
        var conns = 0;
        for (var j = i + 1; j < PARTICLE_COUNT && conns < 3 && lc < MAX_LINES; j++) {
          var dx = pos[j * 3] - pos[i * 3];
          var dy = pos[j * 3 + 1] - pos[i * 3 + 1];
          if (Math.abs(dx) < MAX_CONNECT_DIST && Math.abs(dy) < MAX_CONNECT_DIST && dx * dx + dy * dy < MAX_CONNECT_DIST * MAX_CONNECT_DIST) {
            var b = lc * 6;
            lBuf[b]     = pos[i * 3];     lBuf[b + 1] = pos[i * 3 + 1]; lBuf[b + 2] = pos[i * 3 + 2];
            lBuf[b + 3] = pos[j * 3];     lBuf[b + 4] = pos[j * 3 + 1]; lBuf[b + 5] = pos[j * 3 + 2];
            lc++;
            conns++;
          }
        }
      }
      lGeo.attributes.position.needsUpdate = true;
      lGeo.setDrawRange(0, lc * 2);
    }

    // Camera follows mouse smoothly
    camX += (mx * 2.5 - camX) * 0.04;
    camY += (my * 2.5 - camY) * 0.04;
    camera.position.x = camX;
    camera.position.y = camY;

    frame++;
    renderer.render(scene, camera);
  }

  tick();

  window.addEventListener('resize', function () {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();

// ===================== CUSTOM CURSOR =====================
(function initCursor() {
  var cursor   = document.querySelector('.cursor');
  var follower = document.querySelector('.cursor-follower');
  if (!cursor || !follower) return;

  // Touch devices: hide custom cursor
  if (window.matchMedia('(pointer: coarse)').matches) {
    cursor.style.display   = 'none';
    follower.style.display = 'none';
    return;
  }
  document.body.style.cursor = 'none';

  var mx = 0, my = 0, fx = 0, fy = 0;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    gsap.set(cursor, { x: mx - 4, y: my - 4 });
  });

  (function animFollower() {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    gsap.set(follower, { x: fx - 18, y: fy - 18 });
    requestAnimationFrame(animFollower);
  })();

  var hoverEls = document.querySelectorAll(
    'a, button, .project-action-btn, .project-row-content, ' +
    '.certificate-row-content, .learning-row-content, ' +
    '.experience-content, .education-content, .social-media .icon'
  );
  hoverEls.forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      cursor.classList.add('hover');
      follower.classList.add('hover');
    });
    el.addEventListener('mouseleave', function () {
      cursor.classList.remove('hover');
      follower.classList.remove('hover');
    });
  });
})();

// ===================== HERO — CINEMATIC TEXT REVEAL =====================
(function heroReveal() {
  var nameEl = document.querySelector('.naman');
  if (!nameEl) return;

  // Split name into individual characters
  var text = nameEl.textContent;
  nameEl.innerHTML = '';
  nameEl.style.perspective = '600px';
  text.split('').forEach(function (ch) {
    var span = document.createElement('span');
    span.style.display = 'inline-block';
    // Use non-breaking space (\u00A0) to preserve space width in inline-block spans
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    nameEl.appendChild(span);
  });

  var chars = nameEl.querySelectorAll('span');
  gsap.set(chars, { opacity: 0, y: 60, rotateX: -90, transformOrigin: '0% 50% -20px' });
  gsap.to(chars, {
    opacity: 1, y: 0, rotateX: 0,
    duration: 0.7,
    stagger: 0.045,
    ease: 'back.out(2)',
    delay: 0.3
  });

  // Subtitle fade in
  gsap.from('.khandelwal', { opacity: 0, y: 28, duration: 1.0, delay: 0.9, ease: 'power3.out' });

  // LinkedIn button slide in
  gsap.from('.follow-button', { opacity: 0, x: 40, duration: 0.9, delay: 1.2, ease: 'power3.out' });

  // Profile picture float
  gsap.from('.profile-picture', { opacity: 0, scale: 0.7, duration: 0.9, delay: 0.1, ease: 'back.out(2)' });
  gsap.to('.profile-picture', {
    y: -9, duration: 2.8,
    ease: 'sine.inOut', yoyo: true, repeat: -1
  });

  // Header parallax depth on scroll
  gsap.to('.header', {
    yPercent: 18,
    ease: 'none',
    scrollTrigger: {
      trigger: '.header',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
})();

// ===================== SECTION HEADING REVEALS =====================
gsap.utils.toArray('.project').forEach(function (el) {
  gsap.from(el, {
    x: -60, opacity: 0, rotateY: -8,
    duration: 0.85, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
  });
});

gsap.utils.toArray('.Sub-category').forEach(function (el) {
  gsap.from(el, {
    x: -40, opacity: 0,
    duration: 0.65, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
  });
});

// ===================== EXPERIENCE — 3D SLIDE FROM LEFT =====================
gsap.utils.toArray('.experience-item').forEach(function (el) {
  gsap.from(el, {
    x: -90, opacity: 0, rotateY: -12,
    duration: 0.85, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
  });
});

// ===================== EDUCATION — RISE FROM DEPTH =====================
gsap.utils.toArray('.education-item').forEach(function (el) {
  gsap.from(el, {
    y: 65, opacity: 0, rotateX: 10,
    duration: 0.85, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
  });
});

// ===================== SOCIAL / RESUME BAR =====================
gsap.from('.social-container', {
  scale: 0.9, opacity: 0, y: 40,
  duration: 0.9, ease: 'power3.out',
  scrollTrigger: { trigger: '.social-container', start: 'top 88%', toggleActions: 'play none none none' }
});

// ===================== PROJECTS — 3D CARD REVEAL + IMAGE PARALLAX =====================
gsap.utils.toArray('.project-row-item').forEach(function (el) {
  gsap.from(el, {
    y: 85, opacity: 0, scale: 0.9, rotateX: 8,
    duration: 0.95, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' }
  });
});

// Parallax depth on project thumbnails
gsap.utils.toArray('.project-row-image').forEach(function (img) {
  gsap.to(img, {
    y: -28, ease: 'none',
    scrollTrigger: {
      trigger: img.closest('.project-row-item') || img,
      start: 'top bottom', end: 'bottom top',
      scrub: true
    }
  });
});

// ===================== SKILLS — SLIDE FROM RIGHT =====================
gsap.utils.toArray('.learning-row-item').forEach(function (el) {
  gsap.from(el, {
    x: 85, opacity: 0, rotateY: 10,
    duration: 0.85, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
  });
});

// Skill tags — pop-in with stagger
gsap.utils.toArray('.learning-skill-tag').forEach(function (el, i) {
  gsap.from(el, {
    scale: 0, opacity: 0, rotateZ: -15,
    duration: 0.4, ease: 'back.out(2)',
    scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' }
  });
});

// ===================== CERTIFICATES — DEPTH REVEAL =====================
gsap.utils.toArray('.certificate-row-item').forEach(function (el) {
  gsap.from(el, {
    y: 55, opacity: 0, scale: 0.93,
    duration: 0.85, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' }
  });
});

// ===================== VANILLA TILT — 3D CARD TILT ON HOVER =====================
if (typeof VanillaTilt !== 'undefined') {
  VanillaTilt.init(
    document.querySelectorAll(
      '.project-row-content, .certificate-row-content, ' +
      '.experience-content, .education-content, .learning-row-content'
    ),
    {
      max: 7,
      speed: 600,
      glare: true,
      'max-glare': 0.12,
      perspective: 1200,
      scale: 1.025
    }
  );
}

// ===================== NAVIGATION DOTS =====================
(function initNavDots() {
  var nav = document.querySelector('.nav-dots');
  if (!nav) return;

  var sections = [
    { id: 'section-hero',         label: 'Home' },
    { id: 'section-experience',   label: 'Experience' },
    { id: 'section-education',    label: 'Education' },
    { id: 'section-projects',     label: 'Projects' },
    { id: 'section-skills',       label: 'Skills' },
    { id: 'section-certificates', label: 'Certificates' }
  ];

  sections.forEach(function (s) {
    var dot = document.createElement('div');
    dot.className = 'nav-dot';
    dot.setAttribute('data-section', s.id);
    dot.innerHTML = '<span class="nav-dot-label">' + s.label + '</span>';
    dot.addEventListener('click', function () {
      var target = document.getElementById(s.id);
      if (target) lenis.scrollTo(target, { offset: -60, duration: 1.5 });
    });
    nav.appendChild(dot);
  });

  function setActive(id) {
    nav.querySelectorAll('.nav-dot').forEach(function (d) {
      d.classList.toggle('active', d.getAttribute('data-section') === id);
    });
  }

  sections.forEach(function (s) {
    var el = document.getElementById(s.id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 60%',
      end: 'bottom 40%',
      onEnter:     function () { setActive(s.id); },
      onEnterBack: function () { setActive(s.id); }
    });
  });

  setActive('section-hero');
})();
