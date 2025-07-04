import React from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, ArrowRight, X, Check, Zap, Settings2, Info } from 'lucide-react';
import { ComplexityMode } from './AgentCreationWizard';

interface ModeChangeConfirmModalProps {
  isOpen: boolean;
  currentMode: ComplexityMode;
  targetMode: ComplexityMode;
  onConfirm: () => void;
  onCancel: () => void;
  dataLoss: string[];
  newFeatures: string[];
}

const getModeIcon = (mode: ComplexityMode) => {
  switch (mode) {
    case 'simple': return <Zap className="w-5 h-5" />;
    case 'standard': return <Settings2 className="w-5 h-5" />;
    case 'advanced': return <ArrowUp className="w-5 h-5" />;
  }
};

const getModeColor = (mode: ComplexityMode) => {
  switch (mode) {
    case 'simple': return 'text-status-success';
    case 'standard': return 'text-status-info';
    case 'advanced': return 'text-brand';
  }
};

export const ModeChangeConfirmModal: React.FC<ModeChangeConfirmModalProps> = ({
  isOpen,
  currentMode,
  targetMode,
  onConfirm,
  onCancel,
  dataLoss,
  newFeatures
}) => {
  if (!isOpen) return null;

  const isUpgrade = getModeOrder(targetMode) > getModeOrder(currentMode);
  const isDowngrade = getModeOrder(targetMode) < getModeOrder(currentMode);

  function getModeOrder(mode: ComplexityMode): number {
    switch (mode) {
      case 'simple': return 1;
      case 'standard': return 2;
      case 'advanced': return 3;
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-card rounded-lg shadow-2xl max-w-md w-full border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center">
            {isUpgrade ? (
              <ArrowUp className="w-6 h-6 text-status-success mr-3" />
            ) : isDowngrade ? (
              <ArrowDown className="w-6 h-6 text-status-warning mr-3" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-status-info mr-3" />
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {isUpgrade ? 'Change to' : isDowngrade ? 'Change to' : 'Switch to'} {targetMode.charAt(0).toUpperCase() + targetMode.slice(1)} Mode
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-foreground-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mode Change Summary */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <div className={`flex items-center ${getModeColor(currentMode)}`}>
                {getModeIcon(currentMode)}
                <span className="ml-2 font-medium capitalize">{currentMode}</span>
              </div>
              <ArrowRight className="w-5 h-5 text-foreground-tertiary mx-4" />
              <div className={`flex items-center ${getModeColor(targetMode)}`}>
                {getModeIcon(targetMode)}
                <span className="ml-2 font-medium capitalize">{targetMode}</span>
              </div>
            </div>
          </div>

          {/* Data Loss Warning */}
          {dataLoss.length > 0 && (
            <div className="mb-4 p-4 bg-status-error/10 border border-status-error/20 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-status-error mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground mb-2">Settings Will Be Lost</h4>
                  <p className="text-sm text-foreground-secondary mb-2">
                    The following configurations will be removed when switching to {targetMode} mode:
                  </p>
                  <ul className="text-sm text-foreground-secondary space-y-1">
                    {dataLoss.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-status-error rounded-full mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* New Features */}
          {newFeatures.length > 0 && (
            <div className="mb-4 p-4 bg-status-success/10 border border-status-success/20 rounded-lg">
              <div className="flex items-start">
                <Check className="w-5 h-5 text-status-success mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground mb-2">New Features Available</h4>
                  <p className="text-sm text-foreground-secondary mb-2">
                    You'll gain access to these additional features in {targetMode} mode:
                  </p>
                  <ul className="text-sm text-foreground-secondary space-y-1">
                    {newFeatures.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-status-success rounded-full mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Guidance Message */}
          <div className="mb-6 p-4 bg-status-info/10 border border-status-info/20 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-status-info mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Mode Change Information
                </h4>
                <p className="text-sm text-foreground-secondary">
                  You can switch between modes at any time. Your compatible settings will be preserved when possible.
                  {isDowngrade && ' Consider exporting your current configuration if you want to save advanced settings.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-background-secondary hover:bg-background-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                dataLoss.length > 0 
                  ? 'bg-status-error hover:bg-status-error/90' 
                  : 'bg-brand hover:bg-brand-hover'
              }`}
            >
              Confirm Change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};