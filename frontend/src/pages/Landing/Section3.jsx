const Section3 = ({ t }) => {
  return (
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('homepage.aboutTitle')}</h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
        {t('homepage.aboutSubtitle')}
      </p>
    </div>
  );
};

export default Section3;




