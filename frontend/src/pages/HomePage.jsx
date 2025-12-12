import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LanguageToggle from '../components/ui/LanguageToggle';

const HomePage = ({ onCardSelect }) => {
  const { t } = useTranslation();
  
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
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-200 relative">
      {/* Language Control - Fixed Position */}
      <div className="absolute top-6 right-6 z-10">
        <LanguageToggle />
      </div>
      
      {/* Content Wrapper */}
      <div className="origin-top mx-auto" style={{ transform: 'scale(0.8)', transformOrigin: 'top center', transition: 'transform 150ms ease' }}>
        {/* Header */}
        <div className="text-center py-20 pb-8">
          {/* Welcome Message */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 tracking-wider">
            {t('homepage.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-16">
            {t('homepage.subtitle')}
          </p>
        </div>

        {/* Service Cards */}
        <div className="max-w-7xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {formTypes.map((form) => (
              <Card key={form.id} className={`h-full rounded-[2.2rem] shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${form.panelBgColor}`}> 
                <Card.Body className="text-center p-8 flex flex-col h-full" onClick={() => onCardSelect && onCardSelect(form.id)}>
                  <div className="text-6xl mb-6">{form.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {form.title}
                  </h3>
                  <p className="text-gray-700 mb-8 text-lg leading-relaxed flex-1">
                    {form.description}
                  </p>
                  <div className="mt-auto">
                    <Button variant="primary" className="w-full text-lg py-3 rounded-full">
                      {t('common.getStarted')}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

