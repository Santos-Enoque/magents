import React from 'react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';

export const Header: React.FC = () => {
  const { isConnected } = useWebSocket();
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Agent Dashboard
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* WebSocket connection status */}
          <div className="flex items-center space-x-2">
            <div 
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Notifications */}
          <button className="p-2 text-gray-600 hover:text-gray-900 relative">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-400 rounded-full"></span>
          </button>
          
          {/* User menu */}
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <UserCircleIcon className="h-6 w-6" />
            <span className="text-sm font-medium">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};