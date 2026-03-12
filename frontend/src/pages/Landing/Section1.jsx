import { useCallback, useEffect, useState } from 'react';
import useBreakpoint from '../../hooks/useBreakpoint';

const Section1 = ({ t }) => {
  const { isMobile } = useBreakpoint();

  /* ── Hero text reveal animation ── */
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHeroReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  /* ── Mouse parallax for hero ── */
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = useCallback((e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 50;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    setMousePos({ x, y });
  }, []);

  return (
    <>
      {/* ═══════ Cinematic Hero with Mouse Parallax ═══════ */}
      <section
        className="w-full h-screen relative overflow-hidden cursor-default rounded-t-[3rem]"
        style={{ backgroundColor: '#0a0a0a' }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
      >
        {/* Parallax background — strong mouse tracking */}
        <div
          className="absolute inset-[-60px] transition-transform duration-700 ease-out will-change-transform"
          style={{
            transform: `translate(${mousePos.x}px, ${mousePos.y}px) scale(1.12)`,
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}Journey.jpg`}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.3) saturate(1.3)' }}
          />
        </div>

        {/* Grain overlay */}
        <div className="absolute inset-0 z-[1] opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
        />

        {/* Vignette edges */}
        <div className="absolute inset-0 z-[2] pointer-events-none"
          style={{ boxShadow: 'inset 0 0 150px 60px rgba(0,0,0,0.5)' }}
        />

        {/* Hero content — editorial split layout */}
        <div className="relative z-10 h-full flex items-center px-6 md:px-16 lg:px-24">
          <div className="w-full max-w-7xl mx-auto">
            {/* Big stacked words — each line reveals separately */}
            <div className="space-y-1 md:space-y-2 mb-10">
              {['about.hero.line1', 'about.hero.line2', 'about.hero.line3'].map((key, i) => (
                <div key={key} className="overflow-hidden">
                  <h1
                    className={`h1-heading font-bold text-white leading-[1.25] transition-all duration-1000 ${
                      isMobile ? 'text-[2.5rem]' : 'text-6xl md:text-[5.5rem] lg:text-[7rem]'
                    } ${heroReady ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                    style={{ transitionDelay: `${200 + i * 200}ms` }}
                  >
                    {t(key)}
                  </h1>
                </div>
              ))}
            </div>

            {/* Subtitle — positioned offset to the right */}
            <div className={`md:ml-auto md:max-w-md lg:max-w-lg transition-all duration-1000 delay-[900ms] ${
              heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}>
              <p className={`text-white/60 leading-relaxed font-[300] ${
                isMobile ? 'text-sm' : 'text-base md:text-lg'
              }`}>
                {t('about.heroDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator — bottom center */}
        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-10 transition-all duration-1000 delay-[1200ms] ${
          heroReady ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-[1px] h-16 mx-auto relative overflow-hidden">
            <div
              className="w-full bg-white/50 absolute top-0"
              style={{ height: '40%', animation: 'scrollPulse 2s ease-in-out infinite' }}
            />
          </div>
        </div>
      </section>

      {/* Keyframe for scroll indicator */}
      <style>{`
        @keyframes scrollPulse {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(250%); }
        }
      `}</style>
    </>
  );
};

export default Section1;
