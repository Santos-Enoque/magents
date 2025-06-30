import React from 'react';
import { CheckCircle, Pause, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { AgentStatus } from '@magents/shared';

interface StatusIndicatorProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'dot' | 'full';
  className?: string;
  showText?: boolean;
  isLoading?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  variant = 'badge',
  className = '',
  showText = true,
  isLoading = false,
}) => {
  const getStatusConfig = (status: AgentStatus) => {
    switch (status) {
      case 'RUNNING':
        return {
          color: 'text-green-700 bg-green-100 border-green-200',
          dotColor: 'bg-green-500',
          icon: CheckCircle,
          text: 'Running',
        };
      case 'STOPPED':
        return {
          color: 'text-yellow-700 bg-yellow-100 border-yellow-200',
          dotColor: 'bg-yellow-500',
          icon: Pause,
          text: 'Stopped',
        };
      case 'ERROR':
        return {
          color: 'text-red-700 bg-red-100 border-red-200',
          dotColor: 'bg-red-500',
          icon: AlertCircle,
          text: 'Error',
        };
      default:
        return {
          color: 'text-gray-700 bg-gray-100 border-gray-200',
          dotColor: 'bg-gray-500',
          icon: Clock,
          text: 'Unknown',
        };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          badge: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          dot: 'w-2 h-2',
          text: 'text-xs',
        };
      case 'md':
        return {
          badge: 'px-2.5 py-1.5 text-sm',
          icon: 'w-4 h-4',
          dot: 'w-3 h-3',
          text: 'text-sm',
        };
      case 'lg':
        return {
          badge: 'px-3 py-2 text-base',
          icon: 'w-5 h-5',
          dot: 'w-4 h-4',
          text: 'text-base',
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);
  const Icon = config.icon;

  if (isLoading) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Loader2 className={`${sizeClasses.icon} animate-spin text-gray-500`} />
        {showText && variant !== 'dot' && (
          <span className={`ml-1.5 ${sizeClasses.text} text-gray-500`}>Loading...</span>
        )}
      </div>
    );
  }

  if (variant === 'dot') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className={`${sizeClasses.dot} ${config.dotColor} rounded-full`} />
        {showText && (
          <span className={`ml-2 ${sizeClasses.text} text-gray-900`}>{config.text}</span>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <Icon className={`${sizeClasses.icon} ${config.color.split(' ')[0]}`} />
        {showText && (
          <span className={`${sizeClasses.text} font-medium text-gray-900`}>{config.text}</span>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <span
      className={`inline-flex items-center ${sizeClasses.badge} font-semibold rounded-full border ${config.color} ${className}`}
    >
      <Icon className={`${sizeClasses.icon} mr-1.5`} />
      {showText && config.text}
    </span>
  );
};

// Helper component for status change animations
interface AnimatedStatusIndicatorProps extends StatusIndicatorProps {
  previousStatus?: AgentStatus;
  animationDuration?: number;
}

export const AnimatedStatusIndicator: React.FC<AnimatedStatusIndicatorProps> = ({
  previousStatus,
  animationDuration = 300,
  ...props
}) => {
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (previousStatus && previousStatus !== props.status) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), animationDuration);
      return () => clearTimeout(timer);
    }
  }, [props.status, previousStatus, animationDuration]);

  return (
    <div className={`transition-all duration-${animationDuration} ${isAnimating ? 'scale-110' : 'scale-100'}`}>
      <StatusIndicator {...props} />
    </div>
  );
};

// Bulk status summary component
interface StatusSummaryProps {
  agents: Array<{ status: AgentStatus }>;
  className?: string;
}

export const StatusSummary: React.FC<StatusSummaryProps> = ({ agents, className = '' }) => {
  const summary = agents.reduce(
    (acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    },
    {} as Record<AgentStatus, number>
  );

  const statuses: AgentStatus[] = ['RUNNING', 'STOPPED', 'ERROR'];

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {statuses.map((status) => {
        const count = summary[status] || 0;
        if (count === 0) return null;

        return (
          <div key={status} className="flex items-center space-x-1">
            <StatusIndicator status={status} variant="dot" size="sm" showText={false} />
            <span className="text-sm text-gray-600">
              {count} {status.toLowerCase()}
            </span>
          </div>
        );
      })}
      {agents.length === 0 && (
        <span className="text-sm text-gray-500">No agents</span>
      )}
    </div>
  );
};