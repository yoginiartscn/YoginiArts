import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from './Header';
import Footer from '../components/ui/Footer';

const HomePage = ({ onCardSelect }) => {
  const { t } = useTranslation();
  
  const products = [
    t('homepage.forms.thangka.title'),
    t('homepage.forms.soundBowls.title'),
    t('homepage.forms.sacredItems.title'),
  ];

  const formTypes = [
    {
      id: 'thangka',
      title: t('homepage.forms.thangka.title'),
      description: t('homepage.forms.thangka.description'),
      panelBgColor: 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200',
      icon: '🖼️',
    },
    {
      id: 'soundBowls',
      title: t('homepage.forms.soundBowls.title'),
      description: t('homepage.forms.soundBowls.description'),
      panelBgColor: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200',
      icon: '🔔',
    },
    {
      id: 'sacredItems',
      title: t('homepage.forms.sacredItems.title'),
      description: t('homepage.forms.sacredItems.description'),
      panelBgColor: 'bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200',
      icon: '✨',
    },
    {
      id: 'contact',
      title: t('homepage.forms.contact.title'),
      description: t('homepage.forms.contact.description'),
      panelBgColor: 'bg-gradient-to-br from-green-50 via-green-100 to-green-200',
      icon: '📧',
    }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBE9' }}>
      <Header />
      
      {/* Hero Section - Full width with rounded top corners only */}
      <section className="w-full h-screen relative flex items-center justify-center" style={{ backgroundColor: '#FFFBE9' }}>
        <div className="relative w-[98%] h-full rounded-t-[3.3rem] overflow-hidden" style={{ backgroundColor: '#FFFBE9' }}>
          {/* Background Image - Full width and height */}
          <div className="absolute inset-0">
            <img 
              src="/Homebg.jpg" 
              alt="Yogini Arts" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Gradient Overlay - Transparent top to #A53223 bottom */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, #A53223 100%)'
            }}
          ></div>
          
          {/* Content Overlay */}
          <div className="relative z-10 h-full flex items-end justify-center pb-30">
            <div className="w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              {/* Text and Heading */}
              <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-white mb-4 line-clamp-2 sm:line-clamp-none sm:whitespace-nowrap">
                {t('homepage.heroText')}
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-[5.5rem] font-bold text-white mb-8">
                {t('homepage.heroHeading')}
              </h1>
              
              {/* Button */}
              <button className="bg-gray-800 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-full text-sm sm:text-lg font-medium hover:bg-gray-700 transition-colors">
                {t('homepage.contactUs')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Our Products Section - White Background with rounded top corners */}
      <section className="bg-white py-16 rounded-t-[3.3rem] -mt-[2rem] relative z-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Panel - Products List */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('homepage.ourProducts')}</h2>
              <ul className="space-y-3">
                {products.map((product, index) => (
                  <li key={index} className="text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                    {product}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Panel - CTA Card */}
            <div className="bg-gray-800 rounded-lg p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">{t('homepage.ctaTitle')}</h2>
              <p className="text-gray-300 mb-6">
                {t('homepage.subtitle')}
              </p>
              <button className="bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors w-full">
                {t('common.getStarted')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Yogini Arts Section - White Background */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('homepage.aboutTitle')}</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('homepage.aboutSubtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* The Art of Thangka */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('homepage.pillars.thangka.title')}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('homepage.pillars.thangka.description')}
              </p>
            </div>

            {/* The Sound of Healing */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('homepage.pillars.sound.title')}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('homepage.pillars.sound.description')}
              </p>
            </div>

            {/* Sacred Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('homepage.pillars.sacred.title')}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('homepage.pillars.sacred.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;

