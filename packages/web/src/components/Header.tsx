import React from 'react';
import { BellIcon, UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import { useLocation } from 'react-router-dom';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/agents': 'Agents',
  '/projects': 'Projects',
  '/tasks': 'TaskMaster Tasks',
  '/tasks/assign': 'Assign Tasks',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/terminal': 'Terminal',
};

export const Header: React.FC = () => {
  const { isConnected } = useWebSocket();
  const location = useLocation();
  const currentPage = pageNames[location.pathname] || 'Dashboard';
  
  return (
    <header className="bg-background border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center flex-1">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {currentPage}
            </h2>
            <p className="text-sm text-foreground-tertiary mt-0.5">
              Overview of your multi-agent development environment
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-foreground-tertiary" />
          </div>
          
          {/* WebSocket connection status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-background-tertiary rounded-lg">
            <div 
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-status-success' : 'bg-status-error'
              }`}
            ></div>
            <span className="text-xs text-foreground-secondary font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Notifications */}
          <button className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-status-error rounded-full"></span>
          </button>
          
          {/* User menu */}
          <button className="flex items-center space-x-3 px-3 py-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors">
            <UserCircleIcon className="h-6 w-6" />
            <span className="text-sm font-medium">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};