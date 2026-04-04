/* =============================================================================
   main.js — Three.js 3D Model + GSAP Scroll Animations
   Cyberpunk Portfolio — Naman Khandelwal
   ============================================================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── GSAP from global scope (loaded via CDN script tags) ─────────────────────
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// SECTION 1: THREE.JS — 3D PROFILE MODEL
// =============================================================================

const container = document.getElementById('hero-3d-container');
const canvas = document.getElementById('hero-3d-canvas');

let model = null;
let mixer = null; // for animations if the GLB has them

if (container && canvas) {
  // ─── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // ─── Camera ─────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    40,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.2, 3.5);

  // ─── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 3.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ─── Lighting (bright, true-to-color) ───────────────────────────────────────
  // Strong hemisphere for natural ambient fill
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.5);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  // Bright ambient
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambientLight);

  // Key light — warm white (front-right)
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
  keyLight.position.set(3, 3, 4);
  scene.add(keyLight);

  // Fill light — soft white (front-left)
  const fillLight = new THREE.DirectionalLight(0xeeeeff, 1.8);
  fillLight.position.set(-3, 2, 3);
  scene.add(fillLight);

  // Neon accent — subtle green rim (top)
  const greenRim = new THREE.PointLight(0x00ff88, 1.5, 15);
  greenRim.position.set(0, 4, -1);
  scene.add(greenRim);

  // Neon accent — subtle magenta fill (bottom-left)
  const magentaFill = new THREE.PointLight(0xff00ff, 0.6, 12);
  magentaFill.position.set(-3, -2, 2);
  scene.add(magentaFill);

  // Backlight for rim definition
  const backLight = new THREE.DirectionalLight(0x88ccff, 1.2);
  backLight.position.set(0, 1, -4);
  scene.add(backLight);

  // Extra front fill for face clarity
  const frontFill = new THREE.PointLight(0xffffff, 2.0, 15);
  frontFill.position.set(0, 1, 5);
  scene.add(frontFill);

  // ─── OrbitControls (click + drag = 360° rotation) ──────────────────────────
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // ─── Load GLB Model ────────────────────────────────────────────────────────
  const loader = new GLTFLoader();

  loader.load(
    'profile3d.glb',
    (gltf) => {
      model = gltf.scene;

      // Auto-center and scale
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2.2 / maxDim;

      model.position.sub(center);
      model.scale.setScalar(scale);

      // Clone materials so hover effects don't affect originals globally
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.needsUpdate = true;
        }
      });

      scene.add(model);

      // Play embedded animations if any
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
        });
      }

      // GSAP entrance: scale up from 0
      if (gsap) {
        model.scale.set(0, 0, 0);
        gsap.to(model.scale, {
          x: scale,
          y: scale,
          z: scale,
          duration: 1.4,
          ease: 'elastic.out(1, 0.6)',
          delay: 0.6,
        });
      }
    },
    // Progress
    undefined,
    // Error fallback
    (error) => {
      console.warn('Could not load 3D model:', error);
      // Show fallback profile image
      const fallback = document.createElement('img');
      fallback.src = 'assets/profilepic.png';
      fallback.alt = 'Naman Khandelwal';
      fallback.className = 'profile-picture-fallback';
      canvas.style.display = 'none';
      container.appendChild(fallback);
      const label = container.querySelector('.hero-3d-label');
      if (label) label.style.display = 'none';
    }
  );

  // ─── Hover glow (canvas drop-shadow only, no material tinting) ─────────────
  container.addEventListener('mouseenter', () => {
    canvas.style.filter = 'drop-shadow(0 0 25px rgba(0, 255, 136, 0.45))';
  });
  container.addEventListener('mouseleave', () => {
    canvas.style.filter = 'drop-shadow(0 0 12px rgba(0, 255, 136, 0.2))';
  });

  // ─── Animation Loop ────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    controls.update();

    if (model) {
      // Subtle floating motion
      model.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.03;
    }

    if (mixer) mixer.update(delta);

    renderer.render(scene, camera);
  }

  animate();

  // ─── Resize Handler ────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

// =============================================================================
// SECTION 2: GSAP SCROLL ANIMATIONS
// =============================================================================

if (gsap && ScrollTrigger) {
  // ─── Hero Entrance (on page load) ──────────────────────────────────────────
  const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  heroTl
    .from('.hero-label', { opacity: 0, y: 20, duration: 0.8 })
    .from(
      '.cyber-glitch',
      { opacity: 0, y: 60, scale: 0.95, duration: 1.2, ease: 'power3.out' },
      '-=0.4'
    )
    .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.8 }, '-=0.5')
    .from('.hero-actions', { opacity: 0, y: 20, duration: 0.6 }, '-=0.3');

  // ─── Section Headings ──────────────────────────────────────────────────────
  gsap.utils.toArray('.section-heading').forEach((heading) => {
    gsap.from(heading, {
      scrollTrigger: { trigger: heading, start: 'top 88%' },
      x: -80,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    });
  });

  // ─── Sub-categories ────────────────────────────────────────────────────────
  gsap.utils.toArray('.sub-category').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      x: -40,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    });
  });

  // ─── Experience Cards — Staggered 3D Entrance ─────────────────────────────
  gsap.utils.toArray('.experience-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      y: 50,
      opacity: 0,
      rotateX: -12,
      duration: 0.7,
      delay: i * 0.12,
      ease: 'power3.out',
    });
  });

  // ─── Education Cards — Alternating Slide ───────────────────────────────────
  gsap.utils.toArray('.education-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      x: i % 2 === 0 ? -50 : 50,
      opacity: 0,
      duration: 0.6,
      delay: i * 0.08,
      ease: 'power3.out',
    });
  });

  // ─── Social Bar — Slide Up ─────────────────────────────────────────────────
  gsap.from('.social-container', {
    scrollTrigger: { trigger: '.social-container', start: 'top 90%' },
    y: 60,
    opacity: 0,
    duration: 0.8,
    ease: 'back.out(1.5)',
  });

  // ─── Project Cards — Scale + Fade ──────────────────────────────────────────
  gsap.utils.toArray('.project-row-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      scale: 0.92,
      opacity: 0,
      y: 35,
      duration: 0.6,
      delay: i * 0.08,
      ease: 'power2.out',
    });
  });

  // ─── Learning Cards ────────────────────────────────────────────────────────
  gsap.utils.toArray('.learning-row-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      x: -40,
      opacity: 0,
      duration: 0.6,
      delay: i * 0.1,
      ease: 'power2.out',
    });
  });

  // Skill tags are rendered statically (no GSAP animation needed —
  // the parent .learning-row-item animation handles the entrance).

  // ─── Certificate Cards — Staggered Fade ────────────────────────────────────
  gsap.utils.toArray('.certificate-row-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      y: 40,
      opacity: 0,
      duration: 0.55,
      delay: i * 0.08,
      ease: 'power2.out',
    });
  });

  // ─── More Posts Buttons ────────────────────────────────────────────────────
  gsap.utils.toArray('.morePosts').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 90%' },
      opacity: 0,
      y: 20,
      duration: 0.5,
      ease: 'power2.out',
    });
  });
}
