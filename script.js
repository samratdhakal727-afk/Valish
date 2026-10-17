/**
 * VALISH BEAUTY SALON AND PARLOUR
 * script.js — 2026 Calm Editorial Experience
 * Dependencies: GSAP & ScrollTrigger (cdnjs)
 */

/* --------------------------------------------------------------------------
   01. CONFIGURATION
   -------------------------------------------------------------------------- */
const CONFIG = {
  FRAME_COUNT: 120,
  FRAME_PATH: "frames/frame_",
  FRAME_DIGITS: 4,
  FRAME_EXT: ".jpg"
};

/* --------------------------------------------------------------------------
   02. DOM READY INITIALIZATION
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Register GSAP plugins safely
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  initNavigation();
  initHeroSequence();
  initServiceCounters();
  initScrollAnimations();
  initFaqAccordion();
  initBookingForm();
  initDateConstraints();
});

/* --------------------------------------------------------------------------
   03. NAVIGATION & MOBILE DRAWER
   -------------------------------------------------------------------------- */
function initNavigation() {
  const header = document.getElementById("siteHeader");
  const heroWrapper = document.getElementById("heroScroll");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileDrawer = document.getElementById("mobileDrawer");
  const drawerLinks = document.querySelectorAll(".mobile-nav-link, .mobile-drawer-close-btn");

  // Sticky header background and tone toggle based on scroll
  function updateHeaderState() {
    const scrollY = window.scrollY;

    // Background blur when scrolled
    if (scrollY > 30) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }

    // Adapt contrast when past the dark hero
    if (heroWrapper) {
      const heroRect = heroWrapper.getBoundingClientRect();
      if (heroRect.bottom <= 76) {
        header.classList.remove("over-hero");
      } else {
        header.classList.add("over-hero");
      }
    }
  }

  window.addEventListener("scroll", updateHeaderState, { passive: true });
  updateHeaderState();

  // Mobile Drawer Toggle
  function toggleDrawer(open) {
    const shouldOpen = open !== undefined ? open : !mobileDrawer.classList.contains("is-open");
    mobileDrawer.classList.toggle("is-open", shouldOpen);
    hamburgerBtn.classList.toggle("is-active", shouldOpen);
    hamburgerBtn.setAttribute("aria-expanded", String(shouldOpen));
    mobileDrawer.setAttribute("aria-hidden", String(!shouldOpen));
    document.body.style.overflow = shouldOpen ? "hidden" : "";
  }

  hamburgerBtn.addEventListener("click", () => toggleDrawer());

  // Close drawer on link click
  drawerLinks.forEach(link => {
    link.addEventListener("click", () => toggleDrawer(false));
  });

  // Close drawer on Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileDrawer.classList.contains("is-open")) {
      toggleDrawer(false);
    }
  });
}

/* --------------------------------------------------------------------------
   04. HERO SEQUENCE & CANVAS SCROLL ENGINE
   -------------------------------------------------------------------------- */
function initHeroSequence() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const progressBar = document.getElementById("heroProgressBar");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Frame Cache
  const frames = new Array(CONFIG.FRAME_COUNT + 1);
  const loadedIndices = new Set();
  let renderedFrameIndex = -1;

  // Progress Lerp interpolation
  let targetProgress = 0;
  let currentProgress = 0;
  const LERP_FACTOR = 0.12;

  // Helper to format frame path: frames/frame_0001.jpg
  function getFrameSrc(index) {
    const pad = String(index).padStart(CONFIG.FRAME_DIGITS, "0");
    return `${CONFIG.FRAME_PATH}${pad}${CONFIG.FRAME_EXT}`;
  }

  // Canvas Sizing with DPR
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    // Re-render current frame immediately on resize
    if (renderedFrameIndex > 0) {
      drawFrame(renderedFrameIndex);
    }
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  // Draw frame with object-fit: cover logic
  function drawFrame(frameIndex) {
    const img = getNearestLoadedFrame(frameIndex);
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    if (!iw || !ih) return;

    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) * 0.5;
    const sy = (ch - sh) * 0.5;

    ctx.drawImage(img, sx, sy, sw, sh);
    renderedFrameIndex = frameIndex;
  }

  // Fallback to nearest loaded frame so the screen is never blank
  function getNearestLoadedFrame(index) {
    if (frames[index] && loadedIndices.has(index)) {
      return frames[index];
    }

    if (loadedIndices.size === 0) return null;

    let closest = null;
    let minDiff = Infinity;
    for (const loaded of loadedIndices) {
      const diff = Math.abs(loaded - index);
      if (diff < minDiff) {
        minDiff = diff;
        closest = frames[loaded];
      }
    }
    return closest;
  }

  // Preloading Strategy: Frame 1 immediately, then remainder sequentially
  function preloadFrames() {
    let loadedCount = 0;

    function updateLoadingBar() {
      loadedCount++;
      const pct = Math.round((loadedCount / CONFIG.FRAME_COUNT) * 100);
      if (progressBar) {
        progressBar.style.width = `${pct}%`;
        progressBar.setAttribute("aria-valuenow", String(pct));
        if (pct >= 100) {
          setTimeout(() => progressBar.classList.add("is-loaded"), 250);
        }
      }
    }

    // Step 1: Load Frame 1
    const frame1 = new Image();
    frame1.src = getFrameSrc(1);
    frame1.onload = () => {
      frames[1] = frame1;
      loadedIndices.add(1);
      drawFrame(1);
      updateLoadingBar();

      // If user has reduced motion preference, stop here with static frame
      if (prefersReducedMotion) return;

      // Step 2: Load the rest in background without blocking main thread
      loadRemainingFrames(updateLoadingBar);
    };

    frame1.onerror = () => {
      // Fallback placeholder fill if image sequence folder is not yet placed
      ctx.fillStyle = "#222320";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!prefersReducedMotion) {
        loadRemainingFrames(updateLoadingBar);
      }
    };
  }

  function loadRemainingFrames(onProgress) {
    for (let i = 2; i <= CONFIG.FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameSrc(i);
      img.onload = () => {
        frames[i] = img;
        loadedIndices.add(i);
        onProgress();
      };
      img.onerror = () => {
        onProgress();
      };
    }
  }

  preloadFrames();

  // Skip scroll scrubbing if reduced-motion is requested
  if (prefersReducedMotion) return;

  // Text Overlay Stepping
  const step1 = document.getElementById("heroStep1");
  const step2 = document.getElementById("heroStep2");
  const step3 = document.getElementById("heroStep3");
  const step4 = document.getElementById("heroStep4");

  function updateOverlayRanges(p) {
    // 0% - 15%: Initial Hero Statement
    if (step1) step1.classList.toggle("is-active", p <= 0.18);
    // 25% - 45%: Trained Stylists
    if (step2) step2.classList.toggle("is-active", p >= 0.25 && p <= 0.45);
    // 50% - 70%: Clean, Hygienic Tools
    if (step3) step3.classList.toggle("is-active", p >= 0.50 && p <= 0.70);
    // 75% - 100%: Book Your Visit CTA
    if (step4) step4.classList.toggle("is-active", p >= 0.75);
  }

  // GSAP ScrollTrigger to map scroll scrub
  ScrollTrigger.create({
    trigger: "#heroScroll",
    start: "top top",
    end: "bottom bottom",
    scrub: 0.1,
    onUpdate: (self) => {
      targetProgress = self.progress;
      updateOverlayRanges(self.progress);
    }
  });

  // RAF Smooth Render Loop (Lerp)
  function renderLoop() {
    // Lerp progress to prevent abrupt jumps
    currentProgress += (targetProgress - currentProgress) * LERP_FACTOR;

    const frameIndex = Math.max(
      1,
      Math.min(CONFIG.FRAME_COUNT, Math.round(1 + currentProgress * (CONFIG.FRAME_COUNT - 1)))
    );

    if (frameIndex !== renderedFrameIndex) {
      drawFrame(frameIndex);
    }

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
}

/* --------------------------------------------------------------------------
   05. SERVICES PRICE COUNTER ANIMATION
   -------------------------------------------------------------------------- */
function initServiceCounters() {
  const priceElements = document.querySelectorAll(".service-price");
  if (!priceElements.length) return;

  ScrollTrigger.create({
    trigger: "#services",
    start: "top 75%",
    once: true,
    onEnter: () => {
      priceElements.forEach((el) => {
        const targetValue = parseInt(el.getAttribute("data-target"), 10) || 0;
        const state = { val: 0 };

        gsap.to(state, {
          val: targetValue,
          duration: 1.25,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(state.val).toLocaleString("en-US");
          }
        });
      });
    }
  });
}

/* --------------------------------------------------------------------------
   06. SCROLL REVEALS & GALLERY PARALLAX
   -------------------------------------------------------------------------- */
function initScrollAnimations() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal-fade-up").forEach(el => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }

  // Fade up elements
  const reveals = gsap.utils.toArray(".reveal-fade-up");
  reveals.forEach((target) => {
    gsap.to(target, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: {
        trigger: target,
        start: "top 88%",
        toggleActions: "play none none none"
      }
    });
  });

  // Subtle gallery parallax zoom
  const slots = gsap.utils.toArray(".gallery-slot");
  slots.forEach((slot) => {
    const img = slot.querySelector(".gallery-img");
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.07 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: slot,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    }
  });
}

/* --------------------------------------------------------------------------
   07. ACCESSIBLE FAQ ACCORDION
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const trigger = item.querySelector(".faq-trigger");
    if (!trigger) return;

    trigger.addEventListener("click", () => {
      const isExpanded = item.classList.contains("is-expanded");

      // Close neighboring accordion items for calm reading
      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove("is-expanded");
          otherItem.querySelector(".faq-trigger")?.setAttribute("aria-expanded", "false");
        }
      });

      // Toggle clicked item
      item.classList.toggle("is-expanded", !isExpanded);
      trigger.setAttribute("aria-expanded", String(!isExpanded));
    });
  });
}

/* --------------------------------------------------------------------------
   08. BOOKING FORM FRONT-END VALIDATION & CONFIRMATION
   -------------------------------------------------------------------------- */
function initBookingForm() {
  const form = document.getElementById("bookingForm");
  const submitBtn = document.getElementById("bookingSubmitBtn");
  const confirmationCard = document.getElementById("bookingConfirmationCard");
  const resetBtn = document.getElementById("resetBookingBtn");

  if (!form || !submitBtn || !confirmationCard) return;

  // Form Fields
  const nameField = document.getElementById("clientName");
  const phoneField = document.getElementById("clientPhone");
  const serviceField = document.getElementById("clientService");
  const dateField = document.getElementById("clientDate");
  const timeField = document.getElementById("clientTime");

  // Summary placeholders in confirmation card
  const confirmName = document.getElementById("confirmName");
  const confirmService = document.getElementById("confirmService");
  const confirmDate = document.getElementById("confirmDate");
  const confirmTime = document.getElementById("confirmTime");

  function setFieldError(fieldEl, wrapperId, hasError) {
    const wrapper = document.getElementById(wrapperId);
    if (wrapper) {
      wrapper.classList.toggle("has-error", hasError);
    }
  }

  // Clear errors on input
  [nameField, phoneField, serviceField, dateField, timeField].forEach((field) => {
    if (!field) return;
    field.addEventListener("input", () => {
      const wrapper = field.closest(".form-field");
      if (wrapper) wrapper.classList.remove("has-error");
    });
    field.addEventListener("change", () => {
      const wrapper = field.closest(".form-field");
      if (wrapper) wrapper.classList.remove("has-error");
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let isValid = true;

    // Validate Full Name
    const nameVal = nameField.value.trim();
    if (nameVal.length < 2) {
      setFieldError(nameField, "field-name", true);
      isValid = false;
    } else {
      setFieldError(nameField, "field-name", false);
    }

    // Validate Phone Number (9 to 10 digits for Nepalese formats, ignoring dashes/spaces)
    const rawPhone = phoneField.value.replace(/[\s\-\+\(\)]/g, "");
    const phoneRegex = /^(977)?\d{9,10}$/;
    if (!phoneRegex.test(rawPhone)) {
      setFieldError(phoneField, "field-phone", true);
      isValid = false;
    } else {
      setFieldError(phoneField, "field-phone", false);
    }

    // Validate Service Selection
    if (!serviceField.value) {
      setFieldError(serviceField, "field-service", true);
      isValid = false;
    } else {
      setFieldError(serviceField, "field-service", false);
    }

    // Validate Date (must not be in the past)
    if (!dateField.value) {
      setFieldError(dateField, "field-date", true);
      isValid = false;
    } else {
      const selectedDate = new Date(dateField.value + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setFieldError(dateField, "field-date", true);
        isValid = false;
      } else {
        setFieldError(dateField, "field-date", false);
      }
    }

    // Validate Time Selection
    if (!timeField.value) {
      setFieldError(timeField, "field-time", true);
      isValid = false;
    } else {
      setFieldError(timeField, "field-time", false);
    }

    if (!isValid) {
      // Focus first erroneous field for accessibility
      const firstError = form.querySelector(".form-field.has-error input, .form-field.has-error select");
      if (firstError) firstError.focus();
      return;
    }

    // Show button loading spinner state for ~1 second
    submitBtn.classList.add("is-submitting");

    setTimeout(() => {
      submitBtn.classList.remove("is-submitting");

      // Format clean readable date
      const dateParts = dateField.value.split("-");
      let readableDate = dateField.value;
      if (dateParts.length === 3) {
        const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        readableDate = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      }

      // Populate Confirmation View
      if (confirmName) confirmName.textContent = nameVal;
      if (confirmService) confirmService.textContent = serviceField.value;
      if (confirmDate) confirmDate.textContent = readableDate;
      if (confirmTime) confirmTime.textContent = timeField.value;

      // Swap Form with Confirmation Card
      form.style.display = "none";
      confirmationCard.classList.add("is-visible");
      confirmationCard.focus();
    }, 1000);
  });

  // Reset booking form handler
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      form.reset();
      initDateConstraints();
      form.querySelectorAll(".form-field").forEach(el => el.classList.remove("has-error"));
      confirmationCard.classList.remove("is-visible");
      form.style.display = "block";
    });
  }
}

/* --------------------------------------------------------------------------
   09. DATE INPUT HELPER
   -------------------------------------------------------------------------- */
function initDateConstraints() {
  const dateInput = document.getElementById("clientDate");
  if (!dateInput) return;

  // Set min date attribute to today's local date (YYYY-MM-DD)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  dateInput.min = `${yyyy}-${mm}-${dd}`;
}
