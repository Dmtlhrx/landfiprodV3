import React from 'react';

export const BeninPatternBackground: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="cowrie-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M10,5 Q15,8 10,15 Q5,8 10,5"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
            <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.3" />
          </pattern>
          <pattern id="triangle-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <polygon
              points="7.5,2 12,12 3,12"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#cowrie-pattern)" className="text-primary-500" />
        <rect width="100%" height="100%" fill="url(#triangle-pattern)" className="text-secondary-500" opacity="0.5" />
      </svg>
    </div>
  );
};