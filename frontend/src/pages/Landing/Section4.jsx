const Section4 = ({ t }) => {
  return (
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
  );
};

export default Section4;




