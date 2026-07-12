// Aurora & Custom Cursor Layer Upgrade
// Praeco: The herald of your launch.

(function() {
  // --- Setup & Performance Checks ---
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
                   (navigator.deviceMemory && navigator.deviceMemory <= 2);

  // Global coordinates & scroll tracking
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
  const scroll = { y: 0, prevY: 0, velocity: 0 };
  let globalPulseCurrent = 1.0;
  let inputHueAccumulator = 0;

  // Circular Trail Buffer
  const trailLength = 18;
  const trail = Array.from({ length: trailLength }, () => ({ x: 0, y: 0 }));
  let trailHead = 0;

  // Active inputs & card hovers
  let activeFocusedInput = null;
  const activeHoveredCards = new Set();
  let borderAngleAccumulator = 0;

  // Track mouse coordinates globally
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    scroll.velocity = Math.abs(currentScrollY - scroll.prevY);
    scroll.prevY = currentScrollY;

    // Update scroll progress bar height
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (currentScrollY / docHeight) * 100 : 0;
    const indicator = document.getElementById('aurora-scroll-indicator');
    if (indicator) {
      indicator.style.height = `${progress}%`;
    }
  }, { passive: true });

  // Keypress pulses
  window.addEventListener('keydown', (e) => {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
    const pulseAmount = isInput ? 0.05 : 0.10; // Toned down ribbon velocity pulse on typing
    globalPulseCurrent = 1.0 + pulseAmount;
    
    // Keystroke bottom line ripples disabled per user request
  });

  function createKeystrokeRipple(inputEl) {
    const parent = inputEl.parentNode;
    if (!parent) return;
    
    const existing = parent.querySelectorAll('.keystroke-ripple');
    existing.forEach(r => r.remove());
    
    const ripple = document.createElement('div');
    ripple.className = 'keystroke-ripple';
    parent.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 300);
  }

  // --- Initializing Canvases ---
  const bgCanvas = document.getElementById('aurora-canvas');
  const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
  const cursorCanvas = document.getElementById('cursor-canvas');
  const cursorCtx = cursorCanvas ? cursorCanvas.getContext('2d') : null;

  // Offscreen pre-rendering setup
  let offscreenCanvas = null;
  let offscreenCtx = null;
  if (window.OffscreenCanvas && bgCanvas) {
    offscreenCanvas = new OffscreenCanvas(window.innerWidth, window.innerHeight);
    offscreenCtx = offscreenCanvas.getContext('2d');
  }

  function resizeAll() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    if (bgCanvas) {
      bgCanvas.width = w;
      bgCanvas.height = h;
    }
    if (cursorCanvas) {
      cursorCanvas.width = w;
      cursorCanvas.height = h;
    }
    if (offscreenCanvas) {
      offscreenCanvas.width = w;
      offscreenCanvas.height = h;
    }
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeAll, 100);
  }, { passive: true });
  resizeAll();

  // --- Color Palette definition (selective colors from image) ---
  const ribbonColors = [
    [0, 201, 167],   // teal green (--aurora-1)
    [124, 58, 237],  // violet/purple (--aurora-2)
    [16, 185, 129]   // emerald green (--aurora-5)
  ];

  // --- Pre-Allocating Ribbons (toned down & subtle) ---
  const maxRibbons = 3;
  const ribbons = [];
  for (let i = 0; i < maxRibbons; i++) {
    ribbons.push({
      baseColor: ribbonColors[i % ribbonColors.length],
      speed: 0.00015 + i * 0.00005, // Much slower ambient drift
      amplitude: 45 + i * 10,       // Shorter vertical waves
      frequency: 0.6 + i * 0.2,     // Smoother phase shifts
      opacity: 0.06 - i * 0.015,    // Very dark/subtle (5-6% max opacity)
      phase: Math.random() * Math.PI * 2,
      hueShift: 0,
      points: Array.from({ length: 5 }, (_, idx) => ({
        xRatio: idx / 4,
        yRatio: 0.25 + (i * 0.07) + Math.random() * 0.04,
        x: 0,
        y: 0,
        waveX: 0,
        waveY: 0
      }))
    });
  }

  // --- Pre-Allocating Click Bursts ---
  const maxBursts = 5;
  const bursts = [];

  window.addEventListener('click', (e) => {
    if (prefersReduced) return;
    if (bursts.length >= maxBursts) {
      bursts.shift(); // remove oldest
    }
    bursts.push({
      x: e.clientX,
      y: e.clientY,
      startTime: performance.now(),
      duration: 600,
      maxRadius: 120
    });
  });

  // --- Pre-Allocating Stepper & Hero Particles ---
  const maxStepperParticles = 50;
  const stepperParticles = Array.from({ length: maxStepperParticles }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, color: [0, 0, 0], size: 0, startTime: 0, maxLife: 600, active: false
  }));

  const maxHeroParticles = 40; // 20 standard + 12 burst capacity
  const heroParticles = Array.from({ length: maxHeroParticles }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, size: 0, color: [0, 0, 0], alpha: 0, active: false, isBurst: false, life: 0, maxLife: 0
  }));

  // Initializing 20 static drifting particles
  for (let i = 0; i < 20; i++) {
    const p = heroParticles[i];
    p.active = true;
    p.isBurst = false;
    p.x = Math.random() * window.innerWidth;
    p.y = Math.random() * window.innerHeight;
    p.vx = (Math.random() - 0.5) * 0.3;
    p.vy = -0.2 - Math.random() * 0.3;
    p.size = 2 + Math.random() * 5;
    p.color = ribbonColors[Math.floor(Math.random() * ribbonColors.length)];
    p.alpha = 0.12 + Math.random() * 0.2;
  }

  // Hero section click burst hook
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    heroSection.addEventListener('click', (e) => {
      if (prefersReduced) return;
      let spawned = 0;
      for (let i = 20; i < maxHeroParticles; i++) {
        if (spawned >= 12) break;
        const p = heroParticles[i];
        if (!p.active) {
          p.active = true;
          p.isBurst = true;
          p.x = e.clientX;
          p.y = e.clientY;
          
          const angle = -Math.PI / 4 - Math.random() * Math.PI / 2; // arc upward
          const speed = 2.0 + Math.random() * 3.5;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.size = 2 + Math.random() * 3;
          p.color = ribbonColors[Math.floor(Math.random() * ribbonColors.length)];
          p.alpha = 0.75;
          p.life = 0;
          p.maxLife = 700 + Math.random() * 400; // ms
          
          spawned++;
        }
      }
    });
  }

  // Spawns 8 stepper completion particles
  function spawnStepperParticles(x, y) {
    if (prefersReduced) return;
    let spawned = 0;
    for (let i = 0; i < maxStepperParticles; i++) {
      if (spawned >= 8) break;
      const p = stepperParticles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.2;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.color = ribbonColors[Math.floor(Math.random() * ribbonColors.length)];
        p.size = 3 + Math.random() * 3;
        p.startTime = performance.now();
        
        spawned++;
      }
    }
  }

  // --- Tracking Hovered Targets for Cursor Style ---
  let isHoveringInteractable = false;
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (target && (
      target.closest('.work-card') ||
      target.closest('.form-card') ||
      target.closest('.one-liner-card') ||
      target.closest('.promo-card') ||
      target.closest('a') ||
      target.closest('button') ||
      target.closest('.pill-option label') ||
      target.closest('select') ||
      target.closest('input') ||
      target.closest('textarea')
    )) {
      isHoveringInteractable = true;
    } else {
      isHoveringInteractable = false;
    }
  }, { passive: true });

  // Cursor ring click flash trackers
  let clickFlashTime = 0;
  const clickDuration = 300;
  window.addEventListener('mousedown', () => {
    clickFlashTime = performance.now();
  });

  // --- Helper math functions ---
  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  // --- Cards 3D Tilt Setup ---
  function initCardTilt() {
    if (prefersReduced || isLowEnd) return;

    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.work-card, .form-card, .one-liner-card, .promo-card');
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const px = (x / rect.width) * 2 - 1;
      const py = (y / rect.height) * 2 - 1;

      const tiltX = -py * 8;
      const tiltY = px * 8;

      card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(8px)`;
      card.style.setProperty('--sheen-x', `${x}px`);
      card.style.setProperty('--sheen-y', `${y}px`);
      card.style.setProperty('--sheen-opacity', '0.08');
    }, { passive: true });

    document.addEventListener('mouseleave', (e) => {
      const card = e.target.closest('.work-card, .form-card, .one-liner-card, .promo-card');
      if (card) resetCardTilt(card);
    }, { capture: true, passive: true });

    document.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.work-card, .form-card, .one-liner-card, .promo-card');
      if (card && !card.contains(e.relatedTarget)) resetCardTilt(card);
    }, { passive: true });
  }

  function resetCardTilt(card) {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    card.style.setProperty('--sheen-opacity', '0');
  }

  // --- Dynamic card shimmer overlays & Sweep ---
  document.addEventListener('mouseenter', (e) => {
    const card = e.target.closest('.work-card, .form-card, .one-liner-card, .promo-card');
    if (!card) return;

    activeHoveredCards.add(card);
    card.classList.add('hovered-card');

    let shimmer = card.querySelector('.aurora-shimmer-wave');
    if (!shimmer) {
      shimmer = document.createElement('div');
      shimmer.className = 'aurora-shimmer-wave';
      card.appendChild(shimmer);
    }
    shimmer.style.animation = 'none';
    void shimmer.offsetHeight; // trigger reflow
    shimmer.style.animation = 'shimmer-sweep 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards';
  }, { capture: true, passive: true });

  document.addEventListener('mouseleave', (e) => {
    const card = e.target.closest('.work-card, .form-card, .one-liner-card, .promo-card');
    if (!card) return;

    activeHoveredCards.delete(card);
    card.classList.remove('hovered-card');
    card.style.setProperty('--border-angle', '0deg');
  }, { capture: true, passive: true });

  // --- Inputs focus listeners ---
  document.addEventListener('focusin', (e) => {
    const input = e.target;
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
      activeFocusedInput = input;
      input.classList.add('aurora-focused');
      const group = input.closest('.form-group');
      if (group) {
        const label = group.querySelector('label');
        if (label) label.classList.add('aurora-label-focus');
      }
    }
  }, { passive: true });

  document.addEventListener('focusout', (e) => {
    const input = e.target;
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
      if (activeFocusedInput === input) activeFocusedInput = null;
      input.classList.remove('aurora-focused');
      input.style.removeProperty('--input-border-color');
      const group = input.closest('.form-group');
      if (group) {
        const label = group.querySelector('label');
        if (label) label.classList.remove('aurora-label-focus');
      }
    }
  }, { passive: true });

  // Textarea extra validations
  function initTextareaValidation() {
    const descTextarea = document.getElementById('app-desc');
    const descCounter = document.getElementById('desc-char-count');
    if (descTextarea && descCounter) {
      descTextarea.addEventListener('input', () => {
        const len = descTextarea.value.length;
        descCounter.classList.remove('char-aurora-5', 'char-aurora-6', 'char-orange', 'char-red');
        descTextarea.classList.remove('textarea-pulse-red');
        
        if (len >= 390) {
          descCounter.classList.add('char-red');
          descTextarea.classList.add('textarea-pulse-red');
        } else if (len >= 350) {
          descCounter.classList.add('char-orange');
        } else if (len >= 300) {
          descCounter.classList.add('char-aurora-6');
        } else {
          descCounter.classList.add('char-aurora-5');
        }
      });
    }
  }

  // --- Stepper Observers ---
  function initStepperObserver() {
    const stepper = document.querySelector('.stepper');
    if (!stepper) return;

    const stepStates = { 1: 'active', 2: 'upcoming', 3: 'upcoming' };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const item = mutation.target;
          const idStr = item.id;
          if (!idStr) return;
          const stepNum = parseInt(idStr.replace('step-item-', ''));
          if (isNaN(stepNum)) return;

          const isCompleted = item.classList.contains('completed');
          const isActive = item.classList.contains('active');

          const prevState = stepStates[stepNum];
          let newState = 'upcoming';
          if (isCompleted) newState = 'completed';
          else if (isActive) newState = 'active';

          if (prevState !== newState) {
            stepStates[stepNum] = newState;
            if (newState === 'completed') {
              //Completed spin transition
              const circle = item.querySelector('.step-circle');
              if (circle) {
                circle.classList.remove('aurora-rotate');
                void circle.offsetWidth;
                circle.classList.add('aurora-rotate');
                const rect = circle.getBoundingClientRect();
                spawnStepperParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
              }
            } else if (newState === 'active') {
              //Active double glow pulse
              const circle = item.querySelector('.step-circle');
              if (circle) {
                circle.classList.remove('aurora-active-pulse');
                void circle.offsetWidth;
                circle.classList.add('aurora-active-pulse');
              }
            }
          }
        }
      });
    });

    document.querySelectorAll('.step-item').forEach(item => {
      observer.observe(item, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // --- Primary Button Interaction Ripples ---
  document.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('.btn-primary');
    if (!btn || btn.disabled) return;

    btn.style.transform = 'scale(0.97)';
    btn.style.transition = 'none';

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    btn.appendChild(ripple);

    setTimeout(() => { ripple.remove(); }, 500);

    const handleRelease = () => {
      btn.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease';
      btn.style.transform = 'scale(1.05)';
      setTimeout(() => {
        const isHovered = btn.matches(':hover');
        btn.style.transform = isHovered ? 'scale(1.03)' : 'scale(1.0)';
      }, 150);
      window.removeEventListener('mouseup', handleRelease);
      btn.removeEventListener('mouseleave', handleRelease);
    };

    window.addEventListener('mouseup', handleRelease);
    btn.addEventListener('mouseleave', handleRelease);
  });

  // --- Scroll Observer for Headings ---
  function initScrollObserver() {
    if (prefersReduced) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('heading-revealed');
          el.classList.remove('heading-shimmer');
          void el.offsetWidth;
          el.classList.add('heading-shimmer');
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.section-title').forEach(h => {
      h.classList.add('heading-reveal-prep');
      observer.observe(h);
    });

    const workspaceObserver = new MutationObserver(() => {
      document.querySelectorAll('#positioning-workspace .step-title, #promo-kit-workspace .step-title').forEach(h => {
        if (!h.classList.contains('heading-reveal-prep')) {
          h.classList.add('heading-reveal-prep');
          observer.observe(h);
        }
      });
    });

    const pWorkspace = document.getElementById('positioning-workspace');
    const pkWorkspace = document.getElementById('promo-kit-workspace');
    if (pWorkspace) workspaceObserver.observe(pWorkspace, { childList: true, subtree: true });
    if (pkWorkspace) workspaceObserver.observe(pkWorkspace, { childList: true, subtree: true });
  }

  // --- Load Spinner Hooks ---
  function showSubmitSpinner(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    let spinner = btn.parentNode.querySelector('.aurora-spinner-wrapper');
    if (spinner) return;
    
    spinner = document.createElement('div');
    spinner.className = 'aurora-spinner-wrapper fade-in';
    spinner.innerHTML = `
      <div class="aurora-spinner"></div>
      <div class="aurora-spinner aurora-spinner-glow"></div>
    `;
    btn.parentNode.insertBefore(spinner, btn.nextSibling);
  }

  function hideSubmitSpinner(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    const spinner = btn.parentNode.querySelector('.aurora-spinner-wrapper');
    if (spinner) spinner.remove();
  }

  const globalStateObserver = new MutationObserver(() => {
    const btn1 = document.getElementById('btn-find-positioning');
    if (btn1) {
      const formCard = document.querySelector('.form-card');
      const step2ResultsLoaded = document.getElementById('positioning-workspace').innerHTML !== '';
      if (btn1.disabled && formCard && formCard.classList.contains('locked-form') && !step2ResultsLoaded) {
        showSubmitSpinner('btn-find-positioning');
      } else {
        hideSubmitSpinner('btn-find-positioning');
      }
    }
    
    const btn2 = document.getElementById('btn-generate-promo');
    if (btn2) {
      const step3Item = document.getElementById('step-item-3');
      const step3Active = step3Item && step3Item.classList.contains('active');
      const step3ResultsLoaded = document.getElementById('promo-kit-workspace').innerHTML !== '';
      if (btn2.disabled && step3Active && !step3ResultsLoaded) {
        showSubmitSpinner('btn-generate-promo');
      } else {
        hideSubmitSpinner('btn-generate-promo');
      }
    }
  });

  // --- Staggered Word Reveal in Hero ---
  function initHeroTextAnimations() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;

    const spans = heroTitle.querySelectorAll('span');
    if (spans.length < 2) return;

    spans[0].classList.add('word-fade-slide');
    spans[0].style.transitionDelay = '100ms';

    const text = spans[1].textContent.trim();
    const words = text.split(' ');

    spans[1].innerHTML = '';
    spans[1].classList.add('gradient-text');

    words.forEach((word, idx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word-span word-fade-slide';
      wordSpan.style.transitionDelay = `${300 + idx * 150}ms`;

      if (word.includes('Praeco')) {
        wordSpan.classList.add('shimmering-praeco');
        wordSpan.innerHTML = 'Praeco ';
      } else {
        wordSpan.innerHTML = `${word} `;
      }
      spans[1].appendChild(wordSpan);
    });

    setTimeout(() => {
      document.querySelectorAll('.word-fade-slide').forEach(w => {
        w.classList.add('revealed');
      });
    }, 100);
  }

  // --- Main Animation Loop ---
  let ringX = 0, ringY = 0;
  let currentRingRadius = 10;
  const currentRingColor = [124, 58, 237];

  function loop() {
    requestAnimationFrame(loop);

    const now = performance.now();

    // 1. Scroll velocity decay
    scroll.velocity *= 0.95;

    // 2. Typing pulse decay
    globalPulseCurrent = lerp(globalPulseCurrent, 1.0, 0.1);

    // 3. Render Background Canvas
    if (bgCtx && bgCanvas) {
      // Clear with target offscreen or main screen context
      const renderCtx = offscreenCtx || bgCtx;
      renderCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

      // A. Drawing Northern Lights ribbons
      renderCtx.save();
      renderCtx.globalCompositeOperation = 'screen';

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollRatio = docHeight > 0 ? window.scrollY / docHeight : 0;
      const speedFactor = prefersReduced ? 0.3 : (1 + scroll.velocity / 5000);

      ribbons.forEach(ribbon => {
        ribbon.hueShift = (ribbon.hueShift + 0.1) % 360;

        // Compute points
        ribbon.points.forEach((pt, idx) => {
          const waveX = pt.xRatio * bgCanvas.width + Math.cos(now * 0.00025 + idx * 2 + ribbon.phase) * 30;
          const waveY = pt.yRatio * bgCanvas.height + Math.sin(now * ribbon.speed * speedFactor + idx * ribbon.frequency + ribbon.phase) * ribbon.amplitude * globalPulseCurrent;

          pt.waveX = waveX;
          pt.waveY = waveY;

          if (mouse.active && !prefersReduced) {
            const dx = mouse.x - waveX;
            const dy = mouse.y - waveY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = 350;
            if (dist < radius) {
              const pull = (1 - dist / radius) * 0.035;
              pt.x = lerp(pt.x || waveX, mouse.x, pull);
              pt.y = lerp(pt.y || waveY, mouse.y, pull);
            } else {
              pt.x = lerp(pt.x || waveX, waveX, 0.03);
              pt.y = lerp(pt.y || waveY, waveY, 0.03);
            }
          } else {
            pt.x = lerp(pt.x || waveX, waveX, 0.05);
            pt.y = lerp(pt.y || waveY, waveY, 0.05);
          }
        });

        // Determine hue color
        const base = ribbon.baseColor;
        const targetColor = (ribbon.baseColor === ribbonColors[0] || ribbon.baseColor === ribbonColors[4]) ? [6, 182, 212] : [59, 130, 246];
        const r = Math.round(lerp(base[0], targetColor[0], scrollRatio));
        const g = Math.round(lerp(base[1], targetColor[1], scrollRatio));
        const b = Math.round(lerp(base[2], targetColor[2], scrollRatio));

        let minDistance = Infinity;
        if (mouse.active) {
          ribbon.points.forEach(pt => {
            const dist = Math.hypot(mouse.x - pt.x, mouse.y - pt.y);
            if (dist < minDistance) minDistance = dist;
          });
        }
        const opacityBoost = (mouse.active && minDistance < 300) ? (1 - minDistance / 300) * 0.03 : 0;
        const opacity = Math.min(1, (ribbon.opacity + opacityBoost) * (prefersReduced ? 0.35 : 1));

        if (renderCtx.filter && !isLowEnd) {
          renderCtx.filter = `hue-rotate(${ribbon.hueShift}deg)`;
        }

        const passes = prefersReduced ? 2 : (isLowEnd ? 3 : 5);
        for (let j = 0; j < passes; j++) {
          renderCtx.beginPath();
          const points = ribbon.points;
          renderCtx.moveTo(points[0].x, points[0].y);

          for (let idx = 1; idx < points.length - 1; idx++) {
            const xc = (points[idx].x + points[idx + 1].x) / 2;
            const yc = (points[idx].y + points[idx + 1].y) / 2;
            renderCtx.quadraticCurveTo(points[idx].x, points[idx].y, xc, yc);
          }
          renderCtx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

          renderCtx.lineWidth = 12 + j * 12;
          renderCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity / (j + 1)})`;
          renderCtx.stroke();
        }
        if (renderCtx.filter) renderCtx.filter = 'none';
      });

      renderCtx.restore();

      // B. Render Click Bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        const elapsed = now - b.startTime;
        if (elapsed >= b.duration) {
          bursts.splice(i, 1);
          continue;
        }

        const progress = elapsed / b.duration;
        const radius = b.maxRadius * progress;
        const opacity = 1 - progress;

        const colorIndex = Math.floor(progress * ribbonColors.length) % ribbonColors.length;
        const col = ribbonColors[colorIndex];

        const grad = renderCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
        grad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${opacity * 0.5})`);
        grad.addColorStop(0.5, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${opacity * 0.25})`);
        grad.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);

        renderCtx.save();
        renderCtx.globalCompositeOperation = 'screen';
        renderCtx.fillStyle = grad;
        renderCtx.beginPath();
        renderCtx.arc(b.x, b.y, radius, 0, Math.PI * 2);
        renderCtx.fill();
        renderCtx.restore();
      }

      // C. Render Hero drifting & click-burst particles
      heroParticles.forEach(p => {
        if (!p.active) return;
        if (p.isBurst) {
          p.vy += 0.055; // gravity arc
          p.x += p.vx;
          p.y += p.vy;
          p.life += 16.6;
          
          if (p.life >= p.maxLife) {
            p.active = false;
            return;
          }
          const progress = p.life / p.maxLife;
          const currentAlpha = p.alpha * (1 - progress);
          
          renderCtx.beginPath();
          renderCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          renderCtx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${currentAlpha})`;
          renderCtx.fill();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          
          if (mouse.active && !prefersReduced) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);
            if (dist < 180 && dist > 4) {
              const force = 8 / distSq;
              p.vx += (dx / dist) * force * 0.45;
              p.vy += (dy / dist) * force * 0.45;
              
              const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
              if (speed > 1.2) {
                p.vx = (p.vx / speed) * 1.2;
                p.vy = (p.vy / speed) * 1.2;
              }
            }
          }
          
          p.vx = lerp(p.vx, (Math.random() - 0.5) * 0.2, 0.015);
          
          if (p.y < -10) {
            p.y = bgCanvas.height + 10;
            p.x = Math.random() * bgCanvas.width;
            p.vx = (Math.random() - 0.5) * 0.2;
          }
          if (p.x < -10) p.x = bgCanvas.width + 10;
          if (p.x > bgCanvas.width + 10) p.x = -10;
          
          renderCtx.beginPath();
          renderCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          renderCtx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${p.alpha})`;
          renderCtx.fill();
        }
      });

      // If pre-rendered offscreen, copy onto main screen buffer
      if (offscreenCanvas) {
        bgCtx.drawImage(offscreenCanvas, 0, 0);
      }
    }

    // 4. Update Hover Cards border angles
    borderAngleAccumulator = (borderAngleAccumulator + 5) % 360;
    activeHoveredCards.forEach(card => {
      card.style.setProperty('--border-angle', `${borderAngleAccumulator}deg`);
    });

    // 5. Update Input colors
    if (activeFocusedInput) {
      inputHueAccumulator = (inputHueAccumulator + 2) % 360;
      activeFocusedInput.style.setProperty('--input-border-color', `hsl(${inputHueAccumulator}, 85%, 60%)`);
    }

    // 6. Draw Custom Cursor overlay & Stepper completion particles
    if (cursorCtx && cursorCanvas && !prefersReduced) {
      cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

      // Exact cursor coordinates
      const cursorX = mouse.targetX;
      const cursorY = mouse.targetY;

      // A. Draw Stepper completion burst particles
      stepperParticles.forEach(p => {
        if (!p.active) return;
        const elapsed = now - p.startTime;
        if (elapsed >= p.maxLife) {
          p.active = false;
          return;
        }

        const progress = elapsed / p.maxLife;
        p.x += p.vx;
        p.y += p.vy;

        const opacity = 1 - progress;

        cursorCtx.beginPath();
        cursorCtx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
        cursorCtx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${opacity})`;
        cursorCtx.fill();
      });

      // B. Draw Fading trail dots (toned down, no lag ring)
      const clusterFactor = isHoveringInteractable ? 0.35 : 0;
      for (let i = trailLength - 1; i >= 0; i--) {
        const idx = (trailHead - i - 1 + trailLength) % trailLength;
        const pt = trail[idx];
        if (pt.x === 0 && pt.y === 0) continue;

        const drawX = lerp(pt.x, cursorX, clusterFactor);
        const drawY = lerp(pt.y, cursorY, clusterFactor);

        const size = lerp(3, 0.5, i / (trailLength - 1));
        const opacity = lerp(0.25, 0, i / (trailLength - 1));

        const colIdx = i % ribbonColors.length;
        const col = ribbonColors[colIdx];

        cursorCtx.beginPath();
        cursorCtx.arc(drawX, drawY, size, 0, Math.PI * 2);
        cursorCtx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${opacity})`;
        cursorCtx.fill();
      }

      // Push history pointer
      trail[trailHead] = { x: cursorX, y: cursorY };
      trailHead = (trailHead + 1) % trailLength;

      // C. Draw pointer dot
      cursorCtx.beginPath();
      cursorCtx.arc(cursorX, cursorY, 3, 0, Math.PI * 2);
      cursorCtx.fillStyle = isHoveringInteractable ? '#00c9a7' : '#ffffff';
      cursorCtx.fill();
    }
  }

  // --- Initializing components on load ---
  window.addEventListener('DOMContentLoaded', () => {
    // Dynamic Scroll Indicator setup
    if (!document.getElementById('aurora-scroll-indicator')) {
      const line = document.createElement('div');
      line.id = 'aurora-scroll-indicator';
      document.body.appendChild(line);
    }

    initCardTilt();
    initTextareaValidation();
    initStepperObserver();
    initScrollObserver();
    initHeroTextAnimations();

    // Hook state observer on workspaces parent
    const toolSec = document.getElementById('tool');
    if (toolSec) {
      globalStateObserver.observe(toolSec, { childList: true, subtree: true });
    }

    // Start 60fps animations loop
    requestAnimationFrame(loop);
  });
})();
