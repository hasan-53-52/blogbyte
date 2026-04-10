/**
 * BlogByte — Main Client-Side JavaScript
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavDropdown();
  initMobileNav();
  autoHideFlash();
});

// ── User Menu Dropdown ────────────────────────────────────────
function initNavDropdown() {
  const menu = document.querySelector(".nav__user-menu");
  const btn = document.getElementById("userMenuBtn");
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) menu.classList.remove("open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") menu.classList.remove("open");
  });
}

// ── Mobile Navigation ─────────────────────────────────────────
function initMobileNav() {
  const toggle = document.getElementById("mobileToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (!toggle || !mobileMenu) return;

  toggle.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen);
    // Animate hamburger
    const spans = toggle.querySelectorAll("span");
    if (isOpen) {
      spans[0].style.transform = "rotate(45deg) translate(5px, 5px)";
      spans[1].style.opacity = "0";
      spans[2].style.transform = "rotate(-45deg) translate(5px, -5px)";
    } else {
      spans.forEach((s) => { s.style.transform = ""; s.style.opacity = ""; });
    }
  });
}

// ── Auto-hide flash messages ──────────────────────────────────
function autoHideFlash() {
  const container = document.getElementById("flashContainer");
  if (!container) return;

  setTimeout(() => {
    container.querySelectorAll(".flash").forEach((flash) => {
      flash.style.transition = "all 0.4s ease";
      flash.style.opacity = "0";
      flash.style.transform = "translateX(110%)";
      setTimeout(() => flash.remove(), 400);
    });
  }, 5000);
}

// ── Smooth scroll for anchor links ───────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});
