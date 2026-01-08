import { useEffect, useMemo, useRef, useState } from 'react';
import useBreakpoint from '../../hooks/useBreakpoint';

const PLACEHOLDER_PORTRAIT = 'download.jpeg';
const SECTION3_BG = '#FFFDF2'; // Lighter cream (close to Section2 #FFFBE9)
const SECTION3_BORDER = '#A53223'; // Match Section2 active title color

const Section3 = ({ t }) => {
  const { isMobile, isTablet } = useBreakpoint();
  const testimonialsRaw = t('homepage.section3.testimonials', { returnObjects: true });
  const testimonials = Array.isArray(testimonialsRaw) ? testimonialsRaw : [];

  const fallbackTestimonials = useMemo(
    () => [
      {
        name: 'Singing Bowls',
        image: 'gallery/Section3_1.png',
        quote:
          'Hand-hammered bowls with deep, balanced resonance for meditation and sound healing.',
      },
      {
        name: 'Thangka Art',
        image: 'gallery/Section3_3.png',
        quote:
          'Hand-painted sacred artworks created using traditional iconography and proportions.',
      },
      {
        name: 'Sacred Ornaments',
        image: 'gallery/Section3_2.png',
        quote:
          'Artisan-crafted adornments carrying symbolic meaning drawn from Himalayan spiritual culture.',
      },
    ],
    []
  );

  // We need at least 3 items for a 3-card carousel.
  const baseItems = useMemo(() => testimonials.length >= 3 ? testimonials : fallbackTestimonials, [testimonials, fallbackTestimonials]);
  const baseLen = baseItems.length;

  // Use two copies (1-2-3-... + 1-2-3-...) to allow seamless looping.
  const trackItems = useMemo(() => [...baseItems, ...baseItems], [baseItems]);

  // startIndex is the left-most visible card index inside trackItems.
  // We keep it within [0..baseLen] and jump between equivalent copies to avoid boundaries.
  const [startIndex, setStartIndex] = useState(() => baseLen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDirection, setAnimDirection] = useState(null); // 'next' | 'prev' | null
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const sectionRef = useRef(null);
  const stepRef = useRef(0);
  const trackRef = useRef(null);
  const pendingTargetStartRef = useRef(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button only after scrolling past Section 1 (approx 1 viewport height)
      setShowScrollTop(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const measureStep = () => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector('[data-carousel-card="true"]');
    if (!firstCard) return;

    const cardRect = firstCard.getBoundingClientRect();
    const styles = window.getComputedStyle(track);
    // Modern browsers expose gap; fallback to columnGap.
    const gapStr = styles.gap || styles.columnGap || '0px';
    const gap = Number.parseFloat(gapStr) || 0;
    stepRef.current = cardRect.width + gap;
    setTransitionEnabled(false);
    setTranslateX(-startIndex * stepRef.current);
  };

  useEffect(() => {
    // Measure after mount and on resize to keep animation consistent across breakpoints.
    measureStep();
    window.addEventListener('resize', measureStep);
    return () => window.removeEventListener('resize', measureStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force-hide the global header while Section 3 is visible (same pattern as Section2).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const notify = (hidden) => {
      window.dispatchEvent(new CustomEvent('header:forceHidden', { detail: { id: 'Section3', hidden } }));
    };

    // Ensure header is NOT force-hidden unless Section 3 is actually visible.
    notify(false);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const hidden = Boolean(entry?.isIntersecting);
        notify(hidden);
      },
      { threshold: 0 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      notify(false);
    };
  }, []);

  useEffect(() => {
    // When the dataset changes (language switch), reset to the second copy so we can loop smoothly.
    setTransitionEnabled(false);
    setIsAnimating(false);
    setAnimDirection(null);
    setStartIndex(baseLen);
    if (stepRef.current > 0) {
      setTranslateX(-baseLen * stepRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLen]);

  const animateToStartIndex = (target, dir) => {
    pendingTargetStartRef.current = target;
    setAnimDirection(dir);
    setIsAnimating(true);
    window.requestAnimationFrame(() => {
      setTransitionEnabled(true);
      setTranslateX(-target * stepRef.current);
    });
  };

  const startNext = () => {
    // Next: cards move LEFT -> RIGHT. (translate becomes less negative)
    if (isAnimating || stepRef.current <= 0) return;

    let current = startIndex;
    if (current - 1 < 0) {
      // Jump to the equivalent copy (no visible change), then animate.
      const jumped = current + baseLen;
      setTransitionEnabled(false);
      setStartIndex(jumped);
      setTranslateX(-jumped * stepRef.current);
      current = jumped;
      window.requestAnimationFrame(() => animateToStartIndex(current - 1, 'next'));
      return;
    }

    setTransitionEnabled(true);
    animateToStartIndex(current - 1, 'next');
  };

  const startPrev = () => {
    // Previous: cards move RIGHT -> LEFT. (translate becomes more negative)
    if (isAnimating || stepRef.current <= 0) return;

    let current = startIndex;
    if (current + 1 > baseLen) {
      // Jump to the equivalent copy (no visible change), then animate.
      const jumped = current - baseLen;
      setTransitionEnabled(false);
      setStartIndex(jumped);
      setTranslateX(-jumped * stepRef.current);
      current = jumped;
      window.requestAnimationFrame(() => animateToStartIndex(current + 1, 'prev'));
      return;
    }

    setTransitionEnabled(true);
    animateToStartIndex(current + 1, 'prev');
  };

  const onTrackTransitionEnd = () => {
    if (!isAnimating) return;
    const target = pendingTargetStartRef.current;
    if (typeof target !== 'number') return;

    pendingTargetStartRef.current = null;
    setTransitionEnabled(false);
    setStartIndex(target);
    setTranslateX(-target * stepRef.current);
    setIsAnimating(false);
    setAnimDirection(null);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const activeDot = baseLen > 0 ? (startIndex + 1) % baseLen : 0;

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden"
      style={{ backgroundColor: SECTION3_BG, color: '#000000' }}
    >
      {/* Top faint label */}
      <div className="absolute top-10 w-full text-center z-20 text-black/60 text-[1rem] tracking-[0.35em] font-light px-4">
        {t('homepage.section3.trustedBy')}
      </div>

      {/* Cards row */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-6 md:px-10 py-20">
        <div className="w-full max-w-[1452px] overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-8 will-change-transform"
            style={{
              transform: `translateX(${translateX}px)`,
              transition: transitionEnabled ? 'transform 600ms ease-in-out' : 'none',
            }}
            onTransitionEnd={onTrackTransitionEnd}
          >
            {trackItems.map((card, idx) => {
              // Avoid "black gaps" during transitions by NEVER hiding cards.
              // Overflow clipping ensures only 3 cards are visible, while styling highlights the current center.
              const effectiveStart =
                isAnimating && typeof pendingTargetStartRef.current === 'number'
                  ? pendingTargetStartRef.current
                  : startIndex;
              
              // Mobile: Center is the active card (effectiveStart + 0)
              // Tablet: Show 2 active cards (centerIdx logic might need adjustment, but user asked for 2 active. 
              //         Let's stick to consistent logic where the "active" visual is centered or leading.)
              // Desktop: Center is effectiveStart + 1.
              
              // To support mobile showing only 1 card, we adjust the centerIdx calculation.
              // For mobile, the "center" card is the one at effectiveStart.
              // For Tablet/Desktop (3+ visible), the "center" is effectiveStart + 1.
              const centerOffset = isMobile ? 0 : 1;
              const centerIdx = effectiveStart + centerOffset;
              const dist = Math.abs(idx - centerIdx);

              const isCenter = dist === 0;
              const isSide = !isMobile && dist === 1;

              // On mobile, dim non-center cards completely (or hide them via overflow).
              // The container width handling below ensures only 1 fits.
              const dimClass = isCenter ? '' : isMobile ? 'opacity-0' : isTablet ? '' : 'opacity-70';
              const blurClass = isCenter ? '' : isMobile ? '' : isTablet ? '' : isSide ? 'blur-[1.5px]' : 'blur-[1.5px]';
              const scaleClass = isCenter ? 'scale-[1.02]' : 'scale-100';

              const objectPos = idx < centerIdx ? '20% 30%' : idx === centerIdx ? '50% 25%' : '80% 30%';

              return (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  data-carousel-card="true"
                  className={`relative flex-shrink-0 w-full md:w-[420px] lg:w-[460px] flex flex-col ${dimClass} ${blurClass} ${scaleClass} transition-[filter,opacity,transform] duration-600 ease-in-out`}
                  style={{
                    backgroundColor: SECTION3_BG,
                    borderTop: `1px solid ${SECTION3_BORDER}`,
                    borderRight: `1px solid ${SECTION3_BORDER}`,
                    borderBottom: `1px solid ${SECTION3_BORDER}`,
                    borderLeft: `1px solid ${SECTION3_BORDER}`,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.10)',
                    minHeight: '100%',
                  }}
                >
                  {/* Image area */}
                  <div className="relative h-[48vh] min-h-[340px] overflow-hidden">
                    {(() => {
                      const src = card?.image ? `${import.meta.env.BASE_URL}${card.image}` : `${import.meta.env.BASE_URL}${PLACEHOLDER_PORTRAIT}`;
                      return (
                    <img
                      src={src}
                      alt={card?.name || ''}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        filter: isCenter ? 'none' : 'grayscale(1)',
                        objectPosition: objectPos,
                        imageRendering: 'high-quality',
                        WebkitImageRendering: 'high-quality',
                      }}
                    />
                      );
                    })()}

                    {/* Subtle vignette (so text stays readable) */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle at center, transparent 35%, rgba(255, 253, 242, 0.8) 100%)',
                      }}
                    />

                    {/* Creamy frosted blur overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: isCenter ? 'transparent' : isSide ? 'rgba(255, 253, 242, 0.15)' : 'rgba(255, 253, 242, 0.1)',
                      }}
                    />

                    {/* Name + title overlay */}
                    <div className={`absolute left-0 right-0 text-center px-6 ${isMobile ? 'top-1/2 -translate-y-1/2' : 'bottom-6'}`}>
                      <div 
                        className={`font-medium ${isMobile ? 'text-[#A53223] font-bold' : 'text-white'} ${isCenter ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}
                        style={{
                          textShadow: isMobile ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        {card?.name}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px w-full"
                    style={{ backgroundColor: SECTION3_BORDER }}
                  />

                    {/* Quote area */}
                    <div className="px-8 py-10 md:py-12 text-center flex-1 flex items-center justify-center" style={{ backgroundColor: SECTION3_BG }}>
                      <h5 className="h5-text text-black/70 text-lg md:text-xl leading-relaxed font-[300]">
                        {card?.quote}
                      </h5>
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom navigation (matches screenshot placement) */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 text-black/60">
        <button
          type="button"
          onClick={startPrev}
          disabled={isAnimating}
          className="text-2xl hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: baseLen }).map((_, dot) => (
            <button
              key={dot}
              type="button"
              onClick={() => {
                if (stepRef.current <= 0) return;
                // For mobile, active is just dot (offset 0). For desktop, it's dot-1 (offset 1).
                const centerOffset = isMobile ? 0 : 1;
                let desiredStart = (dot - centerOffset + baseLen) % baseLen;
                if (desiredStart === 0) desiredStart = baseLen; // prefer the second copy for smooth looping
                setTransitionEnabled(false);
                setIsAnimating(false);
                setAnimDirection(null);
                setStartIndex(desiredStart);
                setTranslateX(-desiredStart * stepRef.current);
              }}
              disabled={isAnimating}
              className={`w-2 h-2 rounded-full transition-all disabled:cursor-not-allowed ${
                dot === activeDot ? 'bg-black/70' : 'bg-black/20'
              }`}
              aria-label={`Go to slide ${dot + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={startNext}
          disabled={isAnimating}
          className="text-2xl hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next"
        >
          ›
        </button>
      </div>

      {/* Scroll to top (bottom-right) */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-[#A53223] text-[#FFFBE9] hover:opacity-90 flex items-center justify-center shadow-lg transition-all duration-300 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  );
};

export default Section3;
