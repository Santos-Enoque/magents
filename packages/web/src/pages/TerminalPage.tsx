import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import {
  ArrowLeftIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';

export const TerminalPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [agentId, setAgentId] = useState<string | undefined>(
    searchParams.get('agent') || undefined
  );

  useEffect(() => {
    const agent = searchParams.get('agent');
    setAgentId(agent || undefined);
  }, [searchParams]);

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-background-card border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <CommandLineIcon className="w-6 h-6 text-brand" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Terminal
              </h1>
              {agentId && (
                <p className="text-sm text-foreground-secondary">
                  Connected to Agent {agentId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Terminal Controls */}
        <div className="flex items-center gap-2">
          {agentId && (
            <div className="text-sm text-foreground-secondary bg-background-tertiary px-3 py-1 rounded-full">
              Agent: {agentId}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-6">
        <Terminal
          agentId={agentId}
          isFullscreen={false}
          className="h-full"
        />
      </div>
    </div>
  );
};