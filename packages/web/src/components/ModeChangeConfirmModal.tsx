import React from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, X, Check, Zap, Settings2, Info } from 'lucide-react';
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
    case 'simple': return 'text-green-600';
    case 'standard': return 'text-blue-600';
    case 'advanced': return 'text-purple-600';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {isUpgrade ? (
              <ArrowUp className="w-6 h-6 text-green-600 mr-3" />
            ) : isDowngrade ? (
              <ArrowDown className="w-6 h-6 text-orange-600 mr-3" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-blue-600 mr-3" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Switch'} Complexity Mode
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
              <ArrowUp className="w-5 h-5 text-gray-400 mx-4" />
              <div className={`flex items-center ${getModeColor(targetMode)}`}>
                {getModeIcon(targetMode)}
                <span className="ml-2 font-medium capitalize">{targetMode}</span>
              </div>
            </div>
          </div>

          {/* Data Loss Warning */}
          {dataLoss.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900 mb-2">Settings Will Be Lost</h4>
                  <p className="text-sm text-red-800 mb-2">
                    The following configurations will be removed when switching to {targetMode} mode:
                  </p>
                  <ul className="text-sm text-red-800 space-y-1">
                    {dataLoss.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2 flex-shrink-0" />
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
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900 mb-2">New Features Available</h4>
                  <p className="text-sm text-green-800 mb-2">
                    You'll gain access to these additional features in {targetMode} mode:
                  </p>
                  <ul className="text-sm text-green-800 space-y-1">
                    {newFeatures.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Guidance Message */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  {isUpgrade ? 'Upgrade Guidance' : isDowngrade ? 'Downgrade Notice' : 'Mode Switch'}
                </h4>
                <p className="text-sm text-blue-800">
                  {isUpgrade ? (
                    'You can always return to a simpler mode later. Your current basic settings will be preserved.'
                  ) : isDowngrade ? (
                    'You can upgrade back to a more advanced mode at any time. Consider exporting your current configuration first.'
                  ) : (
                    'Your existing compatible settings will be preserved during this switch.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                dataLoss.length > 0 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : isUpgrade 
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Switch'} Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};