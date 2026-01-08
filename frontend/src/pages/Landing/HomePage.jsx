import { useTranslation } from 'react-i18next';
import Header from '../../components/Header';
import Footer from '../../components/ui/Footer';
import Section1 from './Section1';
import Section2 from './Section2';
import Section3 from './Section3';
import Section4 from './Section4';

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
      <Section3 t={t} />
      <Section4 t={t} />
      
      <div className="flex-grow" />
      <Footer />
    </div>
  );
};

export default HomePage;


