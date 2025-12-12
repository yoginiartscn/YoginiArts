import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import useBreakpoint from '../hooks/useBreakpoint';

// Flag Component - Circular flag display
const FlagIcon = ({ flagSrc, className = "h-5 w-5" }) => (
  <div className={`${className} rounded-full overflow-hidden flex items-center justify-center`}>
    <img 
      src={flagSrc} 
      alt="Flag" 
      className="w-full h-full object-cover rounded-full"
    />
  </div>
);

const Header = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const {
    isSmallMobile,
    isLargeMobile,
    isTabletPortrait,
    isTabletLandscapeSmallDesktop,
    isDesktopLaptop,
    isDesktopLarge,
    isMobile,
    isTablet,
    isDesktop,
  } = useBreakpoint();

  const navigation = [
    { name: t('navigation.home'), href: '/' },
    { name: t('navigation.about'), href: '/about' },
    { name: t('navigation.products'), href: '/products' },
    { name: t('navigation.gallery'), href: '/gallery' },
    { name: t('navigation.exhibition'), href: '/exhibition' },
  ];

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    // Save to localStorage FIRST before changing language
    localStorage.setItem('i18nextLng', newLang);
    // Update HTML lang attribute immediately
    document.documentElement.lang = newLang;
    // Then change the language - this will trigger all components to re-render
    i18n.changeLanguage(newLang).then(() => {
      // Ensure localStorage is synced
      localStorage.setItem('i18nextLng', newLang);
      // Force a page-wide update by dispatching a storage event
      window.dispatchEvent(new StorageEvent('storage', { key: 'i18nextLng', newValue: newLang }));
    });
  };

  // Determine logo size based on breakpoint
  const getLogoSize = () => {
    if (isSmallMobile) return 'h-8';
    if (isLargeMobile) return 'h-9';
    if (isTabletPortrait) return 'h-10';
    if (isTabletLandscapeSmallDesktop) return 'h-11';
    if (isDesktopLaptop) return 'h-12';
    return 'h-12'; // desktopLarge
  };

  // Determine navigation spacing based on breakpoint
  const getNavSpacing = () => {
    if (isTabletPortrait) return 'space-x-6';
    if (isTabletLandscapeSmallDesktop) return 'space-x-7';
    if (isDesktopLaptop) return 'space-x-8';
    return 'space-x-8'; // desktopLarge
  };

  // Determine button sizes
  const getButtonSize = () => {
    if (isTabletPortrait) return 'px-3 py-1.5 text-xs';
    if (isTabletLandscapeSmallDesktop) return 'px-4 py-2 text-sm';
    return 'px-4 py-2 text-sm'; // desktop
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-blur-md shadow-lg' 
          : ''
      }`}
      style={isScrolled 
        ? { backgroundColor: 'rgba(255, 255, 255, 0.7)' }
        : { backgroundColor: '#FFFBE9' }
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center ${isMobile ? 'h-14' : isTablet ? 'h-16' : 'h-20'} py-4`}>
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="/" className="flex items-center">
              <img 
                src="/ColorLogo.png" 
                alt="Yogini Arts" 
                className={`${getLogoSize()} w-auto object-contain`}
              />
            </a>
          </div>

          {/* Navigation - Show on Tablet and Desktop */}
          {(isTablet || isDesktop) && (
            <nav className={`flex items-center ${getNavSpacing()}`}>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`group relative inline-block font-medium transition-colors duration-300 pb-1 ${
                      isTabletPortrait ? 'text-xs' : isTabletLandscapeSmallDesktop ? 'text-sm' : 'text-sm'
                    } ${
                      isActive 
                        ? 'text-[#A53223]' 
                        : 'text-gray-800 hover:text-[#A53223]'
                    }`}
                  >
                    {item.name}
                    <span 
                      className={`absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-300 nav-underline ${
                        isActive 
                          ? 'w-0 opacity-0' 
                          : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-100'
                      }`}
                      style={{ minHeight: '2px' }}
                    ></span>
                  </a>
                );
              })}
            </nav>
          )}

          {/* Language Toggle & CTA Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Reach US Button - Show on Tablet Landscape and Desktop */}
            {(isTabletLandscapeSmallDesktop || isDesktop) && (
              <button className={`bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors ${getButtonSize()}`}>
                {t('navigation.reachUs')}
              </button>
            )}
            
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center justify-center rounded-lg text-[#1e3a8a] transition-colors duration-200 hover:opacity-80 ${
                isMobile ? 'h-8 w-8' : isTabletPortrait ? 'h-9 w-9' : 'h-10 w-10'
              }`}
            >
              <FlagIcon 
                flagSrc={i18n.language === "en" ? "/China.svg" : "/USA.svg"} 
                className={isMobile ? "h-6 w-6" : isTabletPortrait ? "h-6 w-6" : "h-7 w-7"} 
              />
            </button>

            {/* Mobile Menu Toggle Button */}
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="ml-2 p-2 text-gray-800 hover:text-gray-900"
                aria-label="Toggle menu"
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobile && isMobileMenuOpen && (
          <div className="border-t border-gray-300 py-3">
            <div className="px-4 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group block relative font-medium py-2 pb-3 transition-colors duration-300 ${
                      isActive 
                        ? 'text-[#A53223]' 
                        : 'text-gray-800 hover:text-[#A53223]'
                    }`}
                  >
                    {item.name}
                    <span 
                      className={`absolute bottom-1 left-0 h-0.5 rounded-full transition-all duration-300 nav-underline ${
                        isActive 
                          ? 'w-0 opacity-0' 
                          : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-100'
                      }`}
                      style={{ minHeight: '2px' }}
                    ></span>
                  </a>
                );
              })}
              {/* Mobile Reach US Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors mt-2"
              >
                {t('navigation.reachUs')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

