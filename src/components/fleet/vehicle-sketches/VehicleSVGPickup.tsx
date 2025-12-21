import React from 'react';

interface VehicleSVGProps {
  view: 'top' | 'front' | 'rear' | 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export const VehicleSVGPickup: React.FC<VehicleSVGProps> = ({ view, className, onClick }) => {
  const renderView = () => {
    switch (view) {
      case 'top':
        return (
          <g>
            {/* Cabin */}
            <path
              d="M50 10 L150 10 Q165 10 170 25 L175 50 L175 80 L25 80 L25 50 L30 25 Q35 10 50 10 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield */}
            <path
              d="M55 20 L145 20 Q150 20 150 30 L150 40 L50 40 L50 30 Q50 20 55 20 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Bed/Benne */}
            <rect x="25" y="80" width="150" height="100" fill="none" stroke="currentColor" strokeWidth="2" rx="3" />
            <line x1="25" y1="85" x2="175" y2="85" stroke="currentColor" strokeWidth="1" />
            {/* Tires */}
            <rect x="10" y="35" width="18" height="35" fill="currentColor" rx="4" />
            <rect x="172" y="35" width="18" height="35" fill="currentColor" rx="4" />
            <rect x="10" y="140" width="18" height="35" fill="currentColor" rx="4" />
            <rect x="172" y="140" width="18" height="35" fill="currentColor" rx="4" />
            {/* Side mirrors */}
            <ellipse cx="15" cy="45" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="185" cy="45" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      case 'front':
        return (
          <g>
            {/* Body */}
            <path
              d="M25 130 L25 85 Q25 50 55 45 L145 45 Q175 50 175 85 L175 130 Q175 155 165 165 L35 165 Q25 155 25 130 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield */}
            <path
              d="M45 50 L155 50 Q160 50 160 60 L160 80 L40 80 L40 60 Q40 50 45 50 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Grille */}
            <rect x="55" y="120" width="90" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Headlights */}
            <rect x="30" y="105" width="25" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            <rect x="145" y="105" width="25" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Bumper */}
            <path
              d="M20 150 L180 150 Q185 150 185 160 L185 175 L15 175 L15 160 Q15 150 20 150 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Tires */}
            <rect x="15" y="165" width="40" height="25" fill="currentColor" rx="5" />
            <rect x="145" y="165" width="40" height="25" fill="currentColor" rx="5" />
          </g>
        );
      
      case 'rear':
        return (
          <g>
            {/* Tailgate */}
            <rect x="30" y="40" width="140" height="90" fill="none" stroke="currentColor" strokeWidth="2" rx="3" />
            {/* Tailgate handle */}
            <rect x="85" y="125" width="30" height="8" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            {/* Tail lights */}
            <rect x="35" y="100" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            <rect x="140" y="100" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Bumper */}
            <path
              d="M20 145 L180 145 Q185 145 185 155 L185 170 L15 170 L15 155 Q15 145 20 145 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* License plate */}
            <rect x="70" y="55" width="60" height="20" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            {/* Tires */}
            <rect x="15" y="160" width="40" height="25" fill="currentColor" rx="5" />
            <rect x="145" y="160" width="40" height="25" fill="currentColor" rx="5" />
          </g>
        );
      
      case 'left':
      case 'right':
        const isLeft = view === 'left';
        return (
          <g transform={isLeft ? '' : 'translate(200, 0) scale(-1, 1)'}>
            {/* Cabin */}
            <path
              d="M120 50 L120 45 Q120 35 135 35 L160 40 L175 55 L175 95 L120 95 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Cabin window */}
            <path
              d="M125 45 L125 40 Q125 38 135 38 L155 42 L165 55 L165 70 L125 70 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Bed */}
            <rect x="25" y="50" width="95" height="45" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
            {/* Chassis */}
            <rect x="20" y="95" width="160" height="25" fill="none" stroke="currentColor" strokeWidth="2" rx="3" />
            {/* Tires */}
            <circle cx="55" cy="130" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="55" cy="130" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="145" cy="130" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="145" cy="130" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Headlight */}
            <rect x="170" y="65" width="10" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Taillight */}
            <rect x="20" y="55" width="8" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Door handle */}
            <rect x="135" y="70" width="12" height="4" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
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
