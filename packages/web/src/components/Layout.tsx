import React, { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ContentTerminalPane } from './ContentTerminalPane';
import { InlineTerminal } from './InlineTerminal';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(300);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleToggleTerminal = () => {
    setIsTerminalOpen(!isTerminalOpen);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={handleToggleSidebar}
        onTerminalToggle={handleToggleTerminal}
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Main content area */}
          <main 
            className="flex-1 overflow-y-auto bg-background p-6"
            style={{ 
              height: isTerminalOpen ? `calc(100% - ${terminalHeight}px)` : '100%'
            }}
          >
            {children}
          </main>
          
          {/* Terminal pane in content area only */}
          <ContentTerminalPane 
            isOpen={isTerminalOpen}
            height={terminalHeight}
            onHeightChange={setTerminalHeight}
            onClose={() => setIsTerminalOpen(false)}
          />
        </div>
      </div>
      
      {/* Agent-specific inline terminal */}
      <InlineTerminal />
    </div>
  );
};