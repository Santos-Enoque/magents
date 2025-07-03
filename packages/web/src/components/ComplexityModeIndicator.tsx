import React, { useState } from 'react';
import { Zap, Settings2, Wrench, ChevronDown, ArrowRight } from 'lucide-react';
import { ComplexityMode } from './AgentCreationWizard';
import { ModeChangeConfirmModal } from './ModeChangeConfirmModal';

interface ComplexityModeIndicatorProps {
  currentMode: ComplexityMode;
  onModeChange: (mode: ComplexityMode) => void;
  showQuickSwitch?: boolean;
  onModeChangeRequest?: (mode: ComplexityMode) => void;
}

const getModeIcon = (mode: ComplexityMode) => {
  switch (mode) {
    case 'simple': return Zap;
    case 'standard': return Settings2;
    case 'advanced': return Wrench;
  }
};

const getModeColor = (mode: ComplexityMode) => {
  switch (mode) {
    case 'simple': return 'text-green-600 bg-green-50 border-green-200';
    case 'standard': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'advanced': return 'text-purple-600 bg-purple-50 border-purple-200';
  }
};

const MODES: { mode: ComplexityMode; label: string; description: string }[] = [
  { mode: 'simple', label: 'Simple', description: 'Essential options only' },
  { mode: 'standard', label: 'Standard', description: 'Common configurations' },
  { mode: 'advanced', label: 'Advanced', description: 'Full customization' }
];

export const ComplexityModeIndicator: React.FC<ComplexityModeIndicatorProps> = ({
  currentMode,
  onModeChange,
  showQuickSwitch = true,
  onModeChangeRequest
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const CurrentModeIcon = getModeIcon(currentMode);
  const currentModeData = MODES.find(m => m.mode === currentMode);

  const handleModeSelect = (mode: ComplexityMode) => {
    if (mode === currentMode) {
      setShowDropdown(false);
      return;
    }

    setShowDropdown(false);
    
    // If there's a mode change request handler, use it (for more complex validation)
    // Otherwise, change mode directly
    if (onModeChangeRequest) {
      onModeChangeRequest(mode);
    } else {
      onModeChange(mode);
    }
  };

  if (!showQuickSwitch) {
    return (
      <div className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium ${getModeColor(currentMode)}`}>
        <CurrentModeIcon className="w-4 h-4 mr-2" />
        <span className="capitalize">{currentMode} Mode</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium transition-colors hover:opacity-80 ${getModeColor(currentMode)}`}
      >
        <CurrentModeIcon className="w-4 h-4 mr-2" />
        <span className="capitalize">{currentMode} Mode</span>
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1 mb-1">
                Switch Complexity Mode
              </div>
              {MODES.map((mode) => {
                const ModeIcon = getModeIcon(mode.mode);
                const isActive = mode.mode === currentMode;
                
                return (
                  <button
                    key={mode.mode}
                    onClick={() => handleModeSelect(mode.mode)}
                    className={`w-full flex items-center px-2 py-2 rounded-md text-sm transition-colors ${
                      isActive 
                        ? 'bg-brand text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ModeIcon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{mode.label}</div>
                      <div className={`text-xs ${isActive ? 'text-brand-light' : 'text-gray-500'}`}>
                        {mode.description}
                      </div>
                    </div>
                    {!isActive && <ArrowRight className="w-4 h-4 text-gray-400" />}
                    {isActive && <span className="text-xs font-medium">Current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
};