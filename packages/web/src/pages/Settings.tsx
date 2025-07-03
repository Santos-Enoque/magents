import React, { useState } from 'react';
import { FeatureSettings } from '../components/FeatureSettings';
import { Settings as SettingsIcon, Package, Database, Bell, Shield } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('features');

  const tabs = [
    { id: 'features', label: 'Features', icon: Package },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-foreground-secondary mt-2">Configure your Magents system</p>
      </div>
      
      <div className="flex space-x-8">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand/10 text-brand border border-brand/30'
                      : 'hover:bg-background-card text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-background-card border border-border p-6 rounded-lg shadow">
            {activeTab === 'features' && <FeatureSettings />}
            {activeTab === 'database' && (
              <div className="text-foreground-tertiary">
                <h3 className="text-lg font-semibold text-foreground mb-4">Database Settings</h3>
                <p>Database configuration options coming soon...</p>
              </div>
            )}
            {activeTab === 'notifications' && (
              <div className="text-foreground-tertiary">
                <h3 className="text-lg font-semibold text-foreground mb-4">Notification Settings</h3>
                <p>Notification preferences coming soon...</p>
              </div>
            )}
            {activeTab === 'security' && (
              <div className="text-foreground-tertiary">
                <h3 className="text-lg font-semibold text-foreground mb-4">Security Settings</h3>
                <p>Security configuration coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};