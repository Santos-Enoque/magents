import React from 'react';
import { UnifiedDashboard } from '../components/UnifiedDashboard';
import { RealTimeProvider } from '../components/RealTimeProvider';
import { DemoModeProvider } from '../components/DemoModeProvider';

export const Dashboard: React.FC = () => {
  return (
    <DemoModeProvider>
      <RealTimeProvider preferredMethod="auto">
        <UnifiedDashboard />
      </RealTimeProvider>
    </DemoModeProvider>
  );
};