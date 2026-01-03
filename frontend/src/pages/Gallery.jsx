import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/ui/Footer';

const Gallery = () => {
  const { t } = useTranslation();

  const galleryItems = [
    { id: 1, title: t('gallery.item1.title'), description: t('gallery.item1.description') },
    { id: 2, title: t('gallery.item2.title'), description: t('gallery.item2.description') },
    { id: 3, title: t('gallery.item3.title'), description: t('gallery.item3.description') },
    { id: 4, title: t('gallery.item4.title'), description: t('gallery.item4.description') },
    { id: 5, title: t('gallery.item5.title'), description: t('gallery.item5.description') },
    { id: 6, title: t('gallery.item6.title'), description: t('gallery.item6.description') },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FFFBE9' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t('gallery.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('gallery.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="bg-gray-100 rounded-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                  <span className="text-6xl">🖼️</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Gallery;




