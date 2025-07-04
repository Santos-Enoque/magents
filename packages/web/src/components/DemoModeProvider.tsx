import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoModeContextValue {
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

interface DemoModeProviderProps {
  children: React.ReactNode;
}

export const DemoModeProvider: React.FC<DemoModeProviderProps> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Auto-detect demo mode by checking if API is available
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/health`, { 
          method: 'GET',
          timeout: 2000 
        } as any);
        const isDemo = !response.ok;
        setIsDemoMode(isDemo);
        console.log(`API health check: ${response.ok ? '✅ Success' : '❌ Failed'} - Demo mode: ${isDemo ? 'enabled' : 'disabled'}`);
      } catch (error) {
        // API not available, enable demo mode
        console.error('API health check failed:', error);
        setIsDemoMode(true);
        console.log('🎭 Demo mode enabled - API not available');
      }
    };

    checkApiAvailability();
  }, []);

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (enabled) {
      console.log('🎭 Demo mode enabled manually');
    } else {
      console.log('🔗 Demo mode disabled - using real API');
    }
  };

  return (
    <DemoModeContext.Provider value={{ isDemoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextValue => {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};