import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/ui/Footer';

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FFFBE9' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="h1-heading text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t('about.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="h2-text text-3xl font-bold text-gray-900 mb-6">
                {t('about.missionTitle')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                {t('about.missionText')}
              </p>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 h-64 flex items-center justify-center">
              <span className="text-6xl">🕉️</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="h3-text text-xl font-bold text-gray-900 mb-3">
                {t('about.values.art.title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('about.values.art.description')}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="h3-text text-xl font-bold text-gray-900 mb-3">
                {t('about.values.sound.title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('about.values.sound.description')}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="h3-text text-xl font-bold text-gray-900 mb-3">
                {t('about.values.spirituality.title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('about.values.spirituality.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;




