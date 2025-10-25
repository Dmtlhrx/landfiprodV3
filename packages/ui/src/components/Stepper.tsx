import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';

interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed';
}

interface StepperProps {
  steps: Step[];
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ steps, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="relative flex gap-4">
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className="absolute left-4 top-8 w-px h-full bg-dark-600/50" />
          )}
          
          {/* Step indicator */}
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
              step.status === 'completed' && 'bg-primary-500 border-primary-500',
              step.status === 'current' && 'border-primary-500 bg-primary-500/20',
              step.status === 'pending' && 'border-dark-600 bg-dark-800'
            )}
          >
            {step.status === 'completed' ? (
              <Check className="h-4 w-4 text-white" />
            ) : (
              <span
                className={cn(
                  'text-sm font-medium',
                  step.status === 'current' && 'text-primary-400',
                  step.status === 'pending' && 'text-gray-500'
                )}
              >
                {index + 1}
              </span>
            )}
          </div>
          
          {/* Step content */}
          <div className="flex-1 min-w-0 pb-4">
            <h4
              className={cn(
                'font-medium',
                step.status === 'completed' && 'text-white',
                step.status === 'current' && 'text-primary-400',
                step.status === 'pending' && 'text-gray-500'
              )}
            >
              {step.title}
            </h4>
            {step.description && (
              <p className="text-gray-400 text-sm mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};