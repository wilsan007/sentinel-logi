import React from 'react';

interface VehicleSVGProps {
  view: 'top' | 'front' | 'rear' | 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export const VehicleSVGTruck: React.FC<VehicleSVGProps> = ({ view, className, onClick }) => {
  const renderView = () => {
    switch (view) {
      case 'top':
        return (
          <g>
            {/* Cabin */}
            <rect x="130" y="25" width="55" height="70" fill="none" stroke="currentColor" strokeWidth="2" rx="5" />
            {/* Windshield */}
            <rect x="140" y="30" width="35" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Cargo container */}
            <rect x="15" y="20" width="110" height="80" fill="none" stroke="currentColor" strokeWidth="2" rx="3" />
            {/* Container details */}
            <line x1="15" y1="60" x2="125" y2="60" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" />
            {/* Chassis */}
            <rect x="10" y="100" width="180" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Front tires (dual) */}
            <rect x="165" y="100" width="15" height="30" fill="currentColor" rx="3" />
            <rect x="180" y="100" width="15" height="30" fill="currentColor" rx="3" />
            {/* Rear tires (dual axle) */}
            <rect x="5" y="100" width="12" height="25" fill="currentColor" rx="3" />
            <rect x="17" y="100" width="12" height="25" fill="currentColor" rx="3" />
            <rect x="5" y="130" width="12" height="25" fill="currentColor" rx="3" />
            <rect x="17" y="130" width="12" height="25" fill="currentColor" rx="3" />
            {/* Mirrors */}
            <ellipse cx="130" cy="45" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="190" cy="45" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      case 'front':
        return (
          <g>
            {/* Cabin */}
            <path
              d="M30 130 L30 60 Q30 30 55 25 L145 25 Q170 30 170 60 L170 130 Q170 150 160 160 L40 160 Q30 150 30 130 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield */}
            <path
              d="M45 35 L155 35 Q165 35 165 50 L165 85 L35 85 L35 50 Q35 35 45 35 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Grille - large */}
            <rect x="45" y="115" width="110" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            <line x1="75" y1="115" x2="75" y2="145" stroke="currentColor" strokeWidth="1" />
            <line x1="100" y1="115" x2="100" y2="145" stroke="currentColor" strokeWidth="1" />
            <line x1="125" y1="115" x2="125" y2="145" stroke="currentColor" strokeWidth="1" />
            {/* Headlights */}
            <rect x="32" y="100" width="20" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            <rect x="148" y="100" width="20" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Bumper - heavy duty */}
            <path
              d="M20 155 L180 155 Q190 155 190 165 L190 185 L10 185 L10 165 Q10 155 20 155 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Tires */}
            <rect x="10" y="175" width="35" height="20" fill="currentColor" rx="4" />
            <rect x="45" y="175" width="35" height="20" fill="currentColor" rx="4" />
            <rect x="120" y="175" width="35" height="20" fill="currentColor" rx="4" />
            <rect x="155" y="175" width="35" height="20" fill="currentColor" rx="4" />
          </g>
        );
      
      case 'rear':
        return (
          <g>
            {/* Container rear doors */}
            <rect x="25" y="25" width="150" height="130" fill="none" stroke="currentColor" strokeWidth="2" rx="3" />
            {/* Door line */}
            <line x1="100" y1="25" x2="100" y2="155" stroke="currentColor" strokeWidth="1.5" />
            {/* Door handles */}
            <rect x="85" y="85" width="10" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <rect x="105" y="85" width="10" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            {/* Hinges */}
            <rect x="28" y="40" width="5" height="15" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            <rect x="28" y="100" width="5" height="15" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            <rect x="167" y="40" width="5" height="15" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            <rect x="167" y="100" width="5" height="15" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            {/* Tail lights */}
            <rect x="28" y="130" width="15" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            <rect x="157" y="130" width="15" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Bumper */}
            <rect x="20" y="160" width="160" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Dual axle tires */}
            <rect x="10" y="170" width="30" height="18" fill="currentColor" rx="4" />
            <rect x="40" y="170" width="30" height="18" fill="currentColor" rx="4" />
            <rect x="130" y="170" width="30" height="18" fill="currentColor" rx="4" />
            <rect x="160" y="170" width="30" height="18" fill="currentColor" rx="4" />
          </g>
        );
      
      case 'left':
      case 'right':
        const isLeft = view === 'left';
        return (
          <g transform={isLeft ? '' : 'translate(200, 0) scale(-1, 1)'}>
            {/* Cabin */}
            <path
              d="M140 40 L140 35 Q140 25 155 25 L175 30 L185 50 L185 100 L140 100 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Cabin window */}
            <path
              d="M145 38 L145 33 Q145 30 155 30 L170 33 L178 48 L178 70 L145 70 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Container */}
            <rect x="15" y="25" width="125" height="75" fill="none" stroke="currentColor" strokeWidth="2" rx="3" />
            {/* Container ridges */}
            <line x1="40" y1="25" x2="40" y2="100" stroke="currentColor" strokeWidth="1" />
            <line x1="65" y1="25" x2="65" y2="100" stroke="currentColor" strokeWidth="1" />
            <line x1="90" y1="25" x2="90" y2="100" stroke="currentColor" strokeWidth="1" />
            <line x1="115" y1="25" x2="115" y2="100" stroke="currentColor" strokeWidth="1" />
            {/* Chassis */}
            <rect x="10" y="100" width="180" height="20" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
            {/* Front tires */}
            <circle cx="165" cy="135" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="165" cy="135" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Rear tires (dual axle) */}
            <circle cx="40" cy="135" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="40" cy="135" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="75" cy="135" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="75" cy="135" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Fuel tank */}
            <ellipse cx="130" cy="105" rx="15" ry="10" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Headlight */}
            <rect x="180" y="55" width="8" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Taillight */}
            <rect x="12" y="50" width="6" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" rx="1" />
            {/* Mirror */}
            <ellipse cx="145" cy="40" rx="6" ry="12" fill="none" stroke="currentColor" strokeWidth="1" />
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
