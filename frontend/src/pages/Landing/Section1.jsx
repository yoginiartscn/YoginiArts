const Section1 = ({ t }) => {
  return (
    <>
      {/* Hero Section - Full width with rounded top corners only */}
      <section className="w-full h-screen relative flex items-center justify-center" style={{ backgroundColor: '#FFFBE9' }}>
        <div className="relative w-full h-full rounded-t-[3.3rem] overflow-hidden" style={{ backgroundColor: '#FFFBE9' }}>
          {/* Background Image - Full width and height */}
          <div className="absolute inset-0" style={{ top: '-2rem' }}>
            <img
              src={`${import.meta.env.BASE_URL}Homebg.jpg`}
              alt="Hero Background"
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
    </>
  );
};

export default Section1;


