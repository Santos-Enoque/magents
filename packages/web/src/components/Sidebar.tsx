import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  ServerIcon, 
  FolderIcon, 
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Agents', href: '/agents', icon: ServerIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800">Magents</h1>
        <p className="text-gray-600 text-sm mt-1">Multi-Agent Manager</p>
      </div>
      
      <nav className="mt-8">
        <div className="px-2 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>
      
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">System Online</span>
        </div>
      </div>
    </div>
  );
};