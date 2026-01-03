import { useTranslation } from 'react-i18next';
import Header from '../../components/Header';
import Section1 from './Section1';
import Section2 from './Section2';
import Section3 from './Section3';
import Section4 from './Section4';
import Section5 from './Section5';

const HomePage = ({ onCardSelect }) => {
  const { t } = useTranslation();

  // Kept for compatibility with existing routing usage (App passes this prop).
  // No "magic" behavior is added here until explicitly requested.
  void onCardSelect;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBE9' }}>
      <Header />
      <Section1 t={t} />
      <Section2 t={t} />

      {/* About section wrapper */}
      <section
        className="py-16"
        style={{ backgroundColor: '#FFFBE9' }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <Section3 t={t} />
          <Section4 t={t} />
        </div>
      </section>

      <Section5 />
    </div>
  );
};

export default HomePage;


