import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start">
            <h2 className="text-2xl font-bold text-primary-700">Yogini Arts</h2>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('footer.about')}</h3>
            <ul className="space-y-2">
              <li className="text-gray-600">
                <span className="text-gray-700">{t('footer.description')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('footer.contact')}</h3>
            <ul className="space-y-2">
              <li className="text-gray-600">
                <span>{t('footer.contactInfo')}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Yogini Arts. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

