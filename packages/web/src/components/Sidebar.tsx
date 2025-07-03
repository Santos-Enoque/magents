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
  ArrowsRightLeftIcon,
  CommandLineIcon,
  Bars3Icon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavItem[];
  badge?: string | number;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Agents', href: '/agents', icon: ServerIcon, badge: 12 },
  { name: 'Projects', href: '/projects', icon: FolderIcon, badge: 5 },
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

const bottomNavigation: NavItem[] = [
  { name: 'Terminal', icon: CommandLineIcon }, // Remove href to handle click manually
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onTerminalToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  onToggle, 
  onTerminalToggle 
}) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Tasks']);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const handleTerminalClick = () => {
    onTerminalToggle();
  };

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isActive = item.href ? location.pathname === item.href : false;
    const isChildActive = hasChildren && item.children?.some(child => 
      child.href && location.pathname === child.href
    );

    // Special handling for Terminal button
    if (item.name === 'Terminal') {
      return (
        <button
          key={item.name}
          onClick={handleTerminalClick}
          className={`w-full group flex items-center ${
            isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'
          } text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground`}
          title={isCollapsed ? item.name : undefined}
        >
          <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
          {!isCollapsed && <span className="flex-1 text-left">{item.name}</span>}
        </button>
      );
    }

    if (hasChildren) {
      // In collapsed mode, don't show expandable items - they become too complex
      if (isCollapsed) {
        return null;
      }
      
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              isChildActive
                ? 'text-foreground bg-background-tertiary'
                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
            }`}
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
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
                    `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-background-tertiary text-foreground'
                        : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                    }`
                  }
                >
                  <child.icon className="mr-3 h-4 w-4 flex-shrink-0" />
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
          `group flex items-center ${
            isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'
          } text-sm font-medium rounded-md transition-all duration-200 ${
            isActive
              ? 'bg-background-tertiary text-foreground'
              : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
          }`
        }
        title={isCollapsed ? item.name : undefined}
      >
        <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background-tertiary text-foreground-secondary">
                {item.badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && item.badge && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-brand rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div 
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-background-sidebar/95 backdrop-blur-sm border-r border-border/50 flex flex-col h-full transition-all duration-300 ease-in-out shadow-sm`}
    >
      {/* Header with Logo and Toggle */}
      <div className={`${isCollapsed ? 'p-3' : 'p-6'} transition-all duration-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-200">
                <h1 className="text-xl font-semibold text-foreground">Magents</h1>
                <p className="text-foreground-tertiary text-xs">Multi-Agent Dev</p>
              </div>
            )}
          </div>
          
          {/* Toggle Button */}
          <button
            onClick={onToggle}
            className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-1">
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider mb-4 transition-opacity duration-200">
              Navigation
            </h3>
          )}
          {navigation.map(renderNavItem)}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 pb-4 space-y-1 border-t border-border pt-4">
        {bottomNavigation.map(renderNavItem)}
      </div>
      
      {/* Status */}
      <div className={`${isCollapsed ? 'p-3' : 'p-4'} border-t border-border`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="h-2 w-2 bg-status-success rounded-full animate-pulse" />
          {!isCollapsed && (
            <>
              <div className="mr-2" />
              <span className="text-xs text-foreground-tertiary transition-opacity duration-200">
                System Online
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};