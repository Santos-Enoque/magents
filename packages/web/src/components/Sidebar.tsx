import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ServerIcon, 
  FolderIcon, 
  CogIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Agents', href: '/agents', icon: ServerIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { 
    name: 'Tasks', 
    icon: ClipboardDocumentListIcon,
    children: [
      { name: 'Browse', href: '/tasks', icon: ClipboardDocumentListIcon },
      { name: 'Assign', href: '/tasks/assign', icon: ArrowsRightLeftIcon }
    ]
  },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Tasks']);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isActive = item.href ? location.pathname === item.href : false;
    const isChildActive = hasChildren && item.children?.some(child => 
      child.href && location.pathname === child.href
    );

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              isChildActive
                ? 'text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span className="flex-1 text-left">{item.name}</span>
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-8 mt-1 space-y-1">
              {item.children?.map(child => (
                <NavLink
                  key={child.name}
                  to={child.href!}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <child.icon className="mr-3 h-4 w-4" />
                  {child.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.name}
        to={item.href!}
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
    );
  };

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800">Magents</h1>
        <p className="text-gray-600 text-sm mt-1">Multi-Agent Manager</p>
      </div>
      
      <nav className="mt-8">
        <div className="px-2 space-y-1">
          {navigation.map(renderNavItem)}
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