import { useEffect, useMemo, useRef, useState } from 'react';
import useBreakpoint from '../../hooks/useBreakpoint';

// How much page scroll should move to advance one title (larger = slower change).
const SLIDE_SCROLL_STEP_VH = 0.25; // 25vh per step (slower than before)
// How far to scroll into Section 2 before the sticky panel engages.
const STICKY_START_OFFSET_VH = 1; // 1vh
// Cache-buster for public/ assets (helps when CDN/browser caches old images with the same filename)
const GALLERY_ASSET_VERSION = '1';

const Section2 = ({ t }) => {
  const { isMobile, isTablet, isSmallMobile } = useBreakpoint();
  const sectionRef = useRef(null);
  const stickyStartMarkerRef = useRef(null);
  const stickyStartAbsYRef = useRef(0);
  const rafRef = useRef(null);
  const manualNavRef = useRef({ active: false, targetIndex: 0, targetY: 0, raf: null });

  // 3D Model Section Refs
  const modelSectionRef = useRef(null);
  const modelViewerRef = useRef(null);
  const textRef = useRef(null);
  const bowlContainerRef = useRef(null);

  const slides = useMemo(
    () => [
      {
        id: 'thanka',
        title: t('homepage.products.thangka.title'),
        image: `gallery/WhiteTara.jpg?v=${GALLERY_ASSET_VERSION}`,
        pills: [t('homepage.products.thangka.pills.handPainted')],
      },
      {
        id: 'singing-bowl',
        title: t('homepage.products.singingBowl.title'),
        image: `gallery/Singingbowl.jpg?v=${GALLERY_ASSET_VERSION}`,
        pills: [t('homepage.products.singingBowl.pills.handCrafted'), t('homepage.products.singingBowl.pills.madeInNepal')],
      },
      {
        id: 'jwelleries',
        title: t('homepage.products.jewelleries.title'),
        image: `gallery/Beads.jpg?v=${GALLERY_ASSET_VERSION}`,
        pills: [t('homepage.products.jewelleries.pills.handCrafted')],
      },
    ],
    [t]
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

  const [bgGradient, setBgGradient] = useState('rgba(255, 255, 255, 0.6)');

  // 3D Model Scroll Animation
  useEffect(() => {
    const handleModelScroll = () => {
      if (!modelSectionRef.current || !modelViewerRef.current || !textRef.current || !bowlContainerRef.current) return;

      const rect = modelSectionRef.current.getBoundingClientRect();
      const sectionHeight = rect.height;
      const viewportHeight = window.innerHeight;
      
      const maxScroll = sectionHeight - viewportHeight;
      const currentScroll = -rect.top;
      
      let progress = 0;
      if (rect.top <= 0) {
        progress = Math.max(0, Math.min(1, currentScroll / maxScroll));
      } else {
        progress = 0;
      }

      // Dynamic Background Color Animation based on scroll progress
      // Start more transparent, become more opaque white
      // Cycle colors slightly for effect
      const hue = (progress * 50) % 360; // Subtle color shift
      const opacity = 0.5 + (progress * 0.3); // 0.5 -> 0.8
      setBgGradient(`rgba(255, 255, 255, ${opacity})`);

      // Animation Phases
      
      // Responsive adjustments
      const isMobileView = window.innerWidth < 768; // Simple check for animation logic
      
      // Phase 1: 0% - 15% -> Text fades out & moves up, Bowl enters from bottom
      // Reduced duration from 0.2 to 0.15 for quicker transition
      const p1 = Math.min(1, Math.max(0, progress / 0.15));
      
      // Text Animation: Center to Up & Fade
      const textOpacity = 1 - p1;
      const textY = isMobileView ? -100 * p1 : -150 * p1; // Less vertical movement on mobile
      textRef.current.style.opacity = textOpacity;
      textRef.current.style.transform = `translateY(calc(-50% + ${textY}px))`;
      
      // Bowl Entrance: translateY(100%) -> translateY(0%)
      const bowlY = 100 * (1 - p1);
      bowlContainerRef.current.style.transform = `translateY(${bowlY}%)`;
      bowlContainerRef.current.style.opacity = p1; // Fade in

      // Phase 2: 15% - 50% -> Bowl Rotates Horizontally (Theta)
      // Reduced rotation amount: 360 -> 120 degrees
      const p2 = Math.min(1, Math.max(0, (progress - 0.15) / 0.35));
      const theta = p2 * 120; // Only rotate 120 degrees instead of 360

      // Phase 3: 50% - 90% -> Bowl Rotates Vertically (Phi) to "show face"
      const p3 = Math.min(1, Math.max(0, (progress - 0.5) / 0.4));
      const startPhi = 75; // Default side view
      const endPhi = isMobileView ? 30 : 20;   // Less steep angle on mobile
      const phi = startPhi - (startPhi - endPhi) * p3;

      // Apply to model-viewer
      modelViewerRef.current.setAttribute('camera-orbit', `${theta}deg ${phi}deg 105%`);
    };

    window.addEventListener('scroll', handleModelScroll, { passive: true });
    // Initial call
    handleModelScroll();

    return () => {
      window.removeEventListener('scroll', handleModelScroll);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full text-gray-900"
      style={{
        backgroundColor: '#FFFBE9',
      }}
    >
      {/* Entry buffer so the sticky panel "engages" after ~1vh */}
      <div style={{ height: `${STICKY_START_OFFSET_VH}vh` }} />
      <div ref={stickyStartMarkerRef} />

      {/* Sticky viewport panel (driven by page scroll) */}
      <div
        className="relative z-40"
        style={{
          height: `${100 + STICKY_START_OFFSET_VH + (slides.length - 1) * (SLIDE_SCROLL_STEP_VH * 100)}vh`,
        }}
      >
        <div className="sticky top-0 h-screen">
          <div className="relative w-full h-screen flex flex-col lg:flex-row bg-[#FFFBE9]">

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
                    <div key={slide.id}>
                    <button
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
                      
                      {/* Mobile Pills - Just below active title */}
                      {isMobile && isActive && (
                        <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn">
                          {slide.pills?.map((pill, pIdx) => (
                            <div 
                              key={pIdx}
                              className="px-4 py-2 rounded-full border text-[10px] tracking-widest"
                              style={{ 
                                borderColor: pIdx === 0 ? 'black' : 'black', // Using black for visibility on light bg
                                color: 'black',
                                opacity: 0.8 
                              }}
                            >
                              {pill}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

            {/* Previous and Next buttons - above images and mountain */}
            {!isMobile && !isTablet && (
            <div className="absolute top-8 right-8 z-50 flex items-center gap-10 text-xs tracking-widest" style={{ color: '#FFFBE9' }}>
              <button
                type="button"
                onClick={() => goToSlide(activeIndexRef.current - 1)}
                className="hover:opacity-80 transition-opacity"
                style={{ color: '#FFFBE9' }}
              >
                ← {t('common.previous')}
              </button>
              <button
                type="button"
                onClick={() => goToSlide(activeIndexRef.current + 1)}
                className="hover:opacity-80 transition-opacity"
                style={{ color: '#FFFBE9' }}
              >
                {t('common.next')} →
              </button>
            </div>
            )}



          </div>

          {/* Bottom controls */}
          {!isMobile && (
          <div className="absolute z-30 bottom-24 left-16 right-16">
            <div className="flex items-end justify-between gap-6">
              <div className="flex flex-wrap items-center gap-3 lg:max-w-[45%]">
                {slides[activeIndex]?.pills?.[0] && (
                  <button
                    type="button"
                    className="px-6 py-3 rounded-full border text-xs tracking-widest transition-colors"
                    style={{ borderColor: 'black', color: 'black' }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    {slides[activeIndex].pills[0]}
                  </button>
                )}
                {slides[activeIndex]?.pills?.[1] && (
                  <button
                    type="button"
                    className="px-6 py-3 rounded-full border text-xs tracking-widest transition-colors"
                    style={{ borderColor: '#FFFBE9', color: '#FFFBE9' }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    {slides[activeIndex].pills[1]}
                  </button>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Mountain image inside Our Products section - above images, below controls */}
          <div className="absolute left-0 w-full flex items-center justify-center z-20" style={{ bottom: isMobile ? '-40px' : isTablet ? '-150px' : '-300px' }}>
            <img
              src={`${import.meta.env.BASE_URL}Section2.png`}
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none w-full h-auto object-cover"
            />
          </div>
          </div>
        </div>
      </div>

      {/* Entry buffer for About Us section (1vh) */}
      <div style={{ height: `${STICKY_START_OFFSET_VH}vh` }} />
      {/* 3D Model Section */}
      <div 
        ref={modelSectionRef}
        className="relative w-full transition-colors duration-300" 
        style={{ 
          height: '400vh',
          background: `linear-gradient(to bottom, transparent, ${bgGradient}), url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h80v80H0z' fill='none' stroke='%23E5E7EB' stroke-opacity='0.4' stroke-width='1'/%3E%3C/svg%3E")`
        }}
      >
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden z-50">
          {/* About Us Title */}
          <div 
            ref={textRef}
            className="absolute z-0 w-full flex flex-col items-center justify-center pointer-events-none transition-transform duration-75 ease-out text-center px-4" 
            style={{ top: '40%', transform: 'translateY(-50%)', opacity: 1 }}
          >
            <div 
              className={`font-bold tracking-tight leading-none mb-4 sm:mb-6 transition-all duration-300 ${
                isSmallMobile ? 'text-4xl' : isMobile ? 'text-5xl' : isTablet ? 'text-7xl' : 'text-8xl'
              }`} 
              style={{ color: '#A53223' }}
            >
              {t('homepage.feelSingingBowl')}
            </div>
            <p 
              className={`max-w-2xl font-extralight transition-all duration-300 ${
                isSmallMobile ? 'text-sm' : isMobile ? 'text-base' : 'text-xl md:text-2xl'
              }`} 
              style={{ color: '#000000' }}
            >
              {t('homepage.singingBowlDesc')}
            </p>
          </div>

          <div className="w-full px-4 sm:px-6 lg:px-8 relative z-10 h-full flex items-center justify-center">
          {/* Centered 3D model */}
            <div 
              ref={bowlContainerRef}
              className="rounded-2xl overflow-hidden flex justify-center items-center transition-colors duration-300" 
              style={{ 
                width: '100%', 
                maxWidth: isMobile ? '100%' : '1000px', 
                transform: 'translateY(100%)', 
                opacity: 0,
              }}
            >
              <model-viewer
                ref={modelViewerRef}
                src={`${import.meta.env.BASE_URL}gallery/tibetsingingbowl.mr.glb`}
                alt="Tibetan Singing Bowl 3D Model"
                camera-controls={false}
                shadow-intensity="0.8"
                environment-image="neutral"
                disable-zoom
                interaction-policy="allow-when-focused"
                style={{ 
                  width: '100%', 
                  height: isMobile ? '400px' : isTablet ? '600px' : '800px', 
                  background: 'transparent' 
                }}
                camera-orbit="0deg 75deg 105%"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;

