import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useBreakpoint from '../../hooks/useBreakpoint';

const Section4 = ({ t }) => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const sectionRef = useRef(null);
  const [offsetY, setOffsetY] = useState(0);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate opacity based on entry into viewport
      // Starts fading in when top is at 80% of viewport height
      // Fully visible when top is at 40% of viewport height
      const startFade = windowHeight * 0.8;
      const endFade = windowHeight * 0.4;
      
      let newOpacity = 0;
      if (rect.top < startFade) {
        newOpacity = Math.min(1, (startFade - rect.top) / (startFade - endFade));
      }
      setOpacity(newOpacity);

      // Simple parallax calculation
      // Only apply if visible to avoid unnecessary calcs
      if (rect.top < windowHeight && rect.bottom > 0) {
        setOffsetY((window.scrollY - sectionRef.current.offsetTop) * 0.3);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative w-full overflow-hidden text-[#FFFBE9]"
      style={{ minHeight: '80vh' }}
    >
      {/* Background Image with Parallax */}
      <div 
        className="absolute inset-0 z-0 bg-gray-900"
      >
        <div 
            className="absolute inset-0 w-full h-full"
                style={{
                    backgroundImage: `url(${import.meta.env.BASE_URL}Journey.jpg)`,
                    backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `translateY(${offsetY}px) scale(1.1)`, // Scale to prevent whitespace during parallax
                filter: 'brightness(0.5)',
                transition: 'transform 0.1s linear'
            }}
        />
      </div>

      {/* Content */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center h-full min-h-[80vh] px-6 py-20 text-center transition-opacity duration-700 ease-out"
        style={{ opacity: opacity }}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-8 items-center">
            <h2 className={`h2-text font-bold tracking-tight ${isMobile ? 'text-4xl' : 'text-5xl md:text-7xl'}`}>
            {t('homepage.section4.headline')}
            </h2>
            
            <div className="w-24 h-1 bg-[#A53223] rounded-full opacity-80" />

            <p className={`max-w-2xl leading-relaxed tracking-wide font-[200] ${isMobile ? 'text-base' : 'text-xl md:text-2xl'}`}>
            {t('homepage.section4.supportingText')}
            </p>

            <button
              onClick={() => navigate('/products')}
              className="mt-4 px-10 py-4 rounded-full bg-[#A53223] text-[#FFFBE9] text-sm font-medium uppercase tracking-[0.2em] transition-all duration-300 hover:bg-[#c13d2b] hover:shadow-[0_0_30px_rgba(165,50,35,0.4)]"
            >
              {t('homepage.section4.cta')}
            </button>
        </div>
      </div>
    </section>
  );
};

export default Section4;

