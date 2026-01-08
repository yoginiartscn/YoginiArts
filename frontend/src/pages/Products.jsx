import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/ui/Footer';

const Products = () => {
  const { t } = useTranslation();

  const products = [
    {
      id: 'thangka',
      title: t('products.thangka.title'),
      description: t('products.thangka.description'),
      icon: '🖼️',
    },
    {
      id: 'soundBowls',
      title: t('products.soundBowls.title'),
      description: t('products.soundBowls.description'),
      icon: '🔔',
    },
    {
      id: 'sacredItems',
      title: t('products.sacredItems.title'),
      description: t('products.sacredItems.description'),
      icon: '✨',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FFFBE9' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="h1-heading text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t('products.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('products.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-xl transition-shadow"
              >
                <div className="text-6xl mb-6 text-center">{product.icon}</div>
                <h2 className="h2-text text-2xl font-bold text-gray-900 mb-4 text-center">
                  {product.title}
                </h2>
                <p className="text-gray-600 leading-relaxed text-center">
                  {product.description}
                </p>
                <div className="mt-6 text-center">
                  <button className="bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors">
                    {t('common.learnMore')}
                  </button>
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

export default Products;




