import React from 'react';

interface VehicleSVGProps {
  view: 'top' | 'front' | 'rear' | 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export const VehicleSVGSedan: React.FC<VehicleSVGProps> = ({ view, className, onClick }) => {
  const renderView = () => {
    switch (view) {
      case 'top':
        return (
          <g>
            {/* Body outline */}
            <path
              d="M50 10 L150 10 Q170 10 175 30 L180 70 L180 130 L175 170 Q170 190 150 190 L50 190 Q30 190 25 170 L20 130 L20 70 L25 30 Q30 10 50 10 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield */}
            <path
              d="M55 35 L145 35 Q155 35 155 45 L155 55 L45 55 L45 45 Q45 35 55 35 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Rear window */}
            <path
              d="M55 155 L145 155 Q155 155 155 145 L155 135 L45 135 L45 145 Q45 155 55 155 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Roof */}
            <rect x="45" y="55" width="110" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" rx="5" />
            {/* Tires */}
            <rect x="10" y="40" width="15" height="30" fill="currentColor" rx="3" />
            <rect x="175" y="40" width="15" height="30" fill="currentColor" rx="3" />
            <rect x="10" y="130" width="15" height="30" fill="currentColor" rx="3" />
            <rect x="175" y="130" width="15" height="30" fill="currentColor" rx="3" />
            {/* Side mirrors */}
            <ellipse cx="15" cy="55" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="185" cy="55" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      case 'front':
        return (
          <g>
            {/* Body */}
            <path
              d="M30 120 L30 80 Q30 40 60 35 L140 35 Q170 40 170 80 L170 120 Q170 150 160 160 L40 160 Q30 150 30 120 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield */}
            <path
              d="M50 45 L150 45 Q155 45 155 55 L155 75 L45 75 L45 55 Q45 45 50 45 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Grille */}
            <rect x="60" y="120" width="80" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Headlights */}
            <ellipse cx="45" cy="110" rx="12" ry="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="155" cy="110" rx="12" ry="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {/* Bumper */}
            <path
              d="M25 145 L175 145 Q180 145 180 155 L180 165 L20 165 L20 155 Q20 145 25 145 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Tires */}
            <rect x="20" y="155" width="35" height="25" fill="currentColor" rx="5" />
            <rect x="145" y="155" width="35" height="25" fill="currentColor" rx="5" />
            {/* Side mirrors */}
            <ellipse cx="25" cy="60" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="175" cy="60" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      case 'rear':
        return (
          <g>
            {/* Body */}
            <path
              d="M30 120 L30 80 Q30 40 60 35 L140 35 Q170 40 170 80 L170 120 Q170 150 160 160 L40 160 Q30 150 30 120 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Rear window */}
            <path
              d="M50 45 L150 45 Q155 45 155 55 L155 75 L45 75 L45 55 Q45 45 50 45 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Trunk */}
            <rect x="50" y="85" width="100" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Tail lights */}
            <rect x="35" y="100" width="20" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            <rect x="145" y="100" width="20" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Bumper */}
            <path
              d="M25 145 L175 145 Q180 145 180 155 L180 165 L20 165 L20 155 Q20 145 25 145 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* License plate */}
            <rect x="70" y="135" width="60" height="15" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            {/* Tires */}
            <rect x="20" y="155" width="35" height="25" fill="currentColor" rx="5" />
            <rect x="145" y="155" width="35" height="25" fill="currentColor" rx="5" />
          </g>
        );
      
      case 'left':
      case 'right':
        const isLeft = view === 'left';
        return (
          <g transform={isLeft ? '' : 'translate(200, 0) scale(-1, 1)'}>
            {/* Body */}
            <path
              d="M20 100 L20 90 Q20 60 50 55 L70 50 L130 50 Q150 50 155 60 L170 90 L180 90 L180 120 L175 130 L25 130 L20 120 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windows */}
            <path
              d="M55 55 L70 52 L130 52 Q145 52 148 60 L155 75 L55 75 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Door lines */}
            <line x1="85" y1="55" x2="85" y2="120" stroke="currentColor" strokeWidth="1" />
            <line x1="130" y1="60" x2="130" y2="120" stroke="currentColor" strokeWidth="1" />
            {/* Door handles */}
            <rect x="95" y="85" width="15" height="5" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            <rect x="140" y="85" width="15" height="5" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            {/* Tires */}
            <circle cx="50" cy="130" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="130" r="12" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="150" cy="130" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="150" cy="130" r="12" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Headlight */}
            <ellipse cx="175" cy="95" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {/* Taillight */}
            <rect x="15" y="88" width="8" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Side mirror */}
            <ellipse cx="60" cy="55" rx="5" ry="8" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'crosshair' : 'default' }}
    >
      {renderView()}
    </svg>
  );
};
