import { useEffect, useMemo, useRef, useState } from 'react';

// How much page scroll should move to advance one title (larger = slower change).
const SLIDE_SCROLL_STEP_VH = 0.25; // 25vh per step (slower than before)
// How far to scroll into Section 2 before the sticky panel engages.
const STICKY_START_OFFSET_VH = 1; // 1vh

const Section2 = ({ t }) => {
  const sectionRef = useRef(null);
  const stickyStartMarkerRef = useRef(null);
  const stickyStartAbsYRef = useRef(0);
  const rafRef = useRef(null);
  const manualNavRef = useRef({ active: false, targetIndex: 0, targetY: 0, raf: null });

  const slides = useMemo(
    () => [
      {
        id: 'thanka',
        title: 'Thanka',
        image: 'Homebg.jpg',
        pills: ['Painted with Hand'],
      },
      {
        id: 'singing-bowl',
        title: 'Singing Bowl',
        image: 'download.jpeg',
        pills: ['Crafted with hand', 'Made In nepal'],
      },
      {
        id: 'jwelleries',
        title: 'Jwelleries',
        image: 'Homebg.jpg',
        pills: ['Crafted with Hand'],
      },
    ],
    []
  );

  // Default to first slide; scroll handler will correct immediately based on position.
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const recomputeStickyStartAbsY = () => {
    const marker = stickyStartMarkerRef.current;
    if (!marker) return;
    const rect = marker.getBoundingClientRect();
    stickyStartAbsYRef.current = window.scrollY + rect.top;
  };

  // Force-hide the global header while Section 2 is visible.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const notify = (hidden) => {
      window.dispatchEvent(new CustomEvent('header:forceHidden', { detail: { hidden } }));
    };

    // Ensure header is NOT force-hidden unless Section 2 is actually visible.
    notify(false);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const hidden = Boolean(entry?.isIntersecting);
        notify(hidden);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      notify(false);
    };
  }, []);

  const scrollToSlide = (idx) => {
    if (idx < 0 || idx >= slides.length) return;
    recomputeStickyStartAbsY();
    const step = Math.max(1, window.innerHeight * SLIDE_SCROLL_STEP_VH);
    const top = stickyStartAbsYRef.current + idx * step;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const stopManualNav = () => {
    manualNavRef.current.active = false;
    if (manualNavRef.current.raf) {
      window.cancelAnimationFrame(manualNavRef.current.raf);
      manualNavRef.current.raf = null;
    }
  };

  const goToSlide = (idx) => {
    if (idx < 0 || idx >= slides.length) return;
    // Make it feel responsive: update active state immediately, then scroll.
    // Also lock out scroll-based index updates while the smooth scroll is in-flight
    // so Prev/Next works with a single click.
    recomputeStickyStartAbsY();
    const step = Math.max(1, window.innerHeight * SLIDE_SCROLL_STEP_VH);
    const targetY = stickyStartAbsYRef.current + idx * step;

    manualNavRef.current.active = true;
    manualNavRef.current.targetIndex = idx;
    manualNavRef.current.targetY = targetY;

    activeIndexRef.current = idx;
    setActiveIndex(idx);
    window.scrollTo({ top: targetY, behavior: 'smooth' });

    if (manualNavRef.current.raf) {
      window.cancelAnimationFrame(manualNavRef.current.raf);
      manualNavRef.current.raf = null;
    }

    let lastY = window.scrollY;
    let lastMoveAt = performance.now();
    const tick = (now) => {
      if (!manualNavRef.current.active) return;
      const y = window.scrollY;
      const done = Math.abs(y - manualNavRef.current.targetY) <= 2;

      if (done) {
        stopManualNav();
        return;
      }

      if (y !== lastY) {
        lastY = y;
        lastMoveAt = now;
      }

      // If scrolling stopped early (e.g., user interrupted), release the lock.
      if (now - lastMoveAt > 250) {
        stopManualNav();
        return;
      }

      manualNavRef.current.raf = window.requestAnimationFrame(tick);
    };

    manualNavRef.current.raf = window.requestAnimationFrame(tick);
  };

  // Scroll-driven slide activation (sticky panel + tall section).
  useEffect(() => {
    recomputeStickyStartAbsY();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = window.requestAnimationFrame(() => {
        // During programmatic smooth scroll (Prev/Next/title click), keep the chosen slide.
        if (manualNavRef.current.active) {
          ticking = false;
          return;
        }

        const startY = stickyStartAbsYRef.current;
        const vh = Math.max(1, window.innerHeight);
        const step = Math.max(1, vh * SLIDE_SCROLL_STEP_VH);
        const raw = (window.scrollY - startY) / step;
        const idx = Math.max(0, Math.min(slides.length - 1, Math.round(raw)));
        setActiveIndex((prev) => (prev === idx ? prev : idx));
        ticking = false;
      });
    };

    const onResize = () => {
      recomputeStickyStartAbsY();
      onScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      stopManualNav();
    };
  }, [slides.length]);

  return (
    <section
      ref={sectionRef}
      className="w-full text-gray-900"
      style={{
        backgroundColor: '#FFFBE9',
        height: `${100 + STICKY_START_OFFSET_VH + (slides.length - 1) * (SLIDE_SCROLL_STEP_VH * 100)}vh`,
      }}
    >
      {/* Entry buffer so the sticky panel "engages" after ~1vh */}
      <div style={{ height: `${STICKY_START_OFFSET_VH}vh` }} />
      <div ref={stickyStartMarkerRef} />

      {/* Sticky viewport panel (driven by page scroll) */}
      <div className="sticky top-0 h-screen">
        <div className="relative w-full h-screen flex flex-col lg:flex-row bg-[#FFFBE9]">
          {/* Bottom decorative image */}
          <img
            src={`${import.meta.env.BASE_URL}Section2.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-auto object-contain z-20"
          />

          {/* Left Panel */}
          <div className="relative z-10 flex-1 px-6 sm:px-10 lg:px-14 py-8 lg:py-14 flex flex-col overflow-hidden items-start">
            {/* Top group (not centered) */}
            <div className="pt-10 w-full">
              {/* Section label */}
              <div className="inline-flex items-center px-6 py-2 rounded-full border border-[black]/30 bg-white/0 text-xs sm:text-sm font-regular tracking-widest text-[black]">
                {t('homepage.ourProducts')}
              </div>

              {/* Big typography (clickable; active line in brand color, others at 10% opacity) */}
              <div className="mt-6 flex flex-col gap-7">
                {slides.map((slide, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => goToSlide(idx)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`text-left font-bold tracking-tight transition-colors ${
                        isActive
                          ? 'text-[#A53223] text-5xl sm:text-6xl lg:text-7xl leading-none'
                          : 'text-gray-900/10 text-5xl sm:text-6xl lg:text-7xl leading-[0.85] hover:text-gray-900/25'
                      }`}
                    >
                      {slide.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel (Image) */}
          <div className="relative z-10 w-full lg:w-[55%] h-[42vh] lg:h-screen">
            {slides.map((slide, idx) => (
              <img
                key={slide.id}
                src={`${import.meta.env.BASE_URL}${slide.image}`}
                alt={slide.title}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  idx === activeIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>

          {/* Bottom controls (above the PNG) */}
          <div className="absolute z-30 bottom-18 left-16 right-16 text-[#FFFBE9]">
            <div className="flex items-end justify-between gap-6">
              <div className="flex flex-wrap items-center gap-3 lg:max-w-[45%]">
                {slides[activeIndex]?.pills?.[0] && (
                  <button
                    type="button"
                    className="px-6 py-3 rounded-full border border-[#FFFBE9]/60 text-xs tracking-widest hover:border-[#FFFBE9] transition-colors"
                  >
                    {slides[activeIndex].pills[0]}
                  </button>
                )}
                {slides[activeIndex]?.pills?.[1] && (
                  <button
                    type="button"
                    className="px-6 py-3 rounded-full border border-[#FFFBE9]/60 text-xs tracking-widest hover:border-[#FFFBE9] transition-colors"
                  >
                    {slides[activeIndex].pills[1]}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-10 text-xs tracking-widest text-[#FFFBE9]/85">
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndexRef.current - 1)}
                  className="hover:text-[#FFFBE9] transition-colors"
                >
                  ← {t('common.previous')}
                </button>
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndexRef.current + 1)}
                  className="hover:text-[#FFFBE9] transition-colors"
                >
                  {t('common.next')} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;

