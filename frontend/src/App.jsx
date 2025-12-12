import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/ui/Layout';
import HomePage from './pages/HomePage';
import About from './pages/About';
import Products from './pages/Products';
import Gallery from './pages/Gallery';
import Exhibition from './pages/Exhibition';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const { i18n } = useTranslation();

  // Update HTML lang attribute when language changes and ensure all components update
  useEffect(() => {
    // Read from localStorage to ensure consistency
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      if (i18n.language !== savedLang) {
        i18n.changeLanguage(savedLang);
      }
      document.documentElement.lang = savedLang;
    } else {
      document.documentElement.lang = i18n.language;
    }
  }, [i18n.language, i18n]);

  // Listen for storage events to sync language across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'i18nextLng' && e.newValue && (e.newValue === 'en' || e.newValue === 'zh')) {
        i18n.changeLanguage(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [i18n]);

  const handleCardSelect = (formType) => {
    // Handle navigation to different sections
    console.log('Selected:', formType);
    // You can add routing logic here or state management
  };

  // Set base path for production (Render deployment)
  const basename = import.meta.env.PROD ? '/YoginiArts' : '';

  return (
    <Router basename={basename}>
      <Layout showNavigation={false}>
        <Routes>
          <Route 
            path="/" 
            element={<HomePage onCardSelect={handleCardSelect} />} 
          />
          <Route 
            path="/about" 
            element={<About />} 
          />
          <Route 
            path="/products" 
            element={<Products />} 
          />
          <Route 
            path="/gallery" 
            element={<Gallery />} 
          />
          <Route 
            path="/exhibition" 
            element={<Exhibition />} 
          />
          <Route 
            path="/*" 
            element={<HomePage onCardSelect={handleCardSelect} />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

