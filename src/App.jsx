import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/ui/Layout';
import HomePage from './pages/HomePage';

function App() {
  const [currentView, setCurrentView] = useState('home');

  const handleCardSelect = (formType) => {
    // Handle navigation to different sections
    console.log('Selected:', formType);
    // You can add routing logic here or state management
  };

  return (
    <Router>
      <Layout showNavigation={false}>
        <Routes>
          <Route 
            path="/" 
            element={<HomePage onCardSelect={handleCardSelect} />} 
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

