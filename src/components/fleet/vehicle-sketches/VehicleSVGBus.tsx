import React from 'react';

interface VehicleSVGProps {
  view: 'top' | 'front' | 'rear' | 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export const VehicleSVGBus: React.FC<VehicleSVGProps> = ({ view, className, onClick }) => {
  const renderView = () => {
    switch (view) {
      case 'top':
        return (
          <g>
            {/* Body outline - long rectangle */}
            <rect x="15" y="15" width="170" height="90" fill="none" stroke="currentColor" strokeWidth="2" rx="8" />
            {/* Windshield */}
            <rect x="160" y="20" width="20" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" rx="4" />
            {/* Rear window */}
            <rect x="20" y="25" width="15" height="70" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Roof AC units */}
            <rect x="50" y="40" width="25" height="40" fill="none" stroke="currentColor" strokeWidth="1" rx="3" />
            <rect x="85" y="40" width="25" height="40" fill="none" stroke="currentColor" strokeWidth="1" rx="3" />
            <rect x="120" y="40" width="25" height="40" fill="none" stroke="currentColor" strokeWidth="1" rx="3" />
            {/* Front tires */}
            <rect x="155" y="5" width="15" height="20" fill="currentColor" rx="3" />
            <rect x="155" y="95" width="15" height="20" fill="currentColor" rx="3" />
            {/* Rear tires (dual) */}
            <rect x="30" y="5" width="12" height="18" fill="currentColor" rx="2" />
            <rect x="42" y="5" width="12" height="18" fill="currentColor" rx="2" />
            <rect x="30" y="97" width="12" height="18" fill="currentColor" rx="2" />
            <rect x="42" y="97" width="12" height="18" fill="currentColor" rx="2" />
            {/* Mirrors */}
            <ellipse cx="158" cy="10" rx="6" ry="4" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="158" cy="110" rx="6" ry="4" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      case 'front':
        return (
          <g>
            {/* Body - tall */}
            <path
              d="M25 150 L25 45 Q25 20 50 15 L150 15 Q175 20 175 45 L175 150 Q175 165 165 175 L35 175 Q25 165 25 150 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield - large */}
            <path
              d="M40 25 L160 25 Q170 25 170 40 L170 100 L30 100 L30 40 Q30 25 40 25 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Destination sign */}
            <rect x="50" y="30" width="100" height="20" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            {/* Headlights */}
            <circle cx="45" cy="125" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="155" cy="125" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {/* Turn signals */}
            <rect x="60" y="115" width="15" height="10" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <rect x="125" y="115" width="15" height="10" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            {/* Bumper */}
            <rect x="20" y="160" width="160" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" rx="5" />
            {/* Door */}
            <rect x="70" y="100" width="60" height="55" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <line x1="100" y1="100" x2="100" y2="155" stroke="currentColor" strokeWidth="1" />
            {/* Tires */}
            <rect x="15" y="170" width="40" height="20" fill="currentColor" rx="5" />
            <rect x="145" y="170" width="40" height="20" fill="currentColor" rx="5" />
            {/* Mirrors */}
            <ellipse cx="20" cy="60" rx="8" ry="15" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="180" cy="60" rx="8" ry="15" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      case 'rear':
        return (
          <g>
            {/* Body - tall */}
            <path
              d="M25 150 L25 45 Q25 20 50 15 L150 15 Q175 20 175 45 L175 150 Q175 165 165 175 L35 175 Q25 165 25 150 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Rear window */}
            <rect x="40" y="25" width="120" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" rx="5" />
            {/* Emergency exit */}
            <rect x="70" y="35" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <text x="100" y="60" textAnchor="middle" fontSize="8" fill="currentColor">EXIT</text>
            {/* Engine compartment */}
            <rect x="35" y="95" width="130" height="55" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Vents */}
            <line x1="50" y1="100" x2="50" y2="145" stroke="currentColor" strokeWidth="1" />
            <line x1="75" y1="100" x2="75" y2="145" stroke="currentColor" strokeWidth="1" />
            <line x1="100" y1="100" x2="100" y2="145" stroke="currentColor" strokeWidth="1" />
            <line x1="125" y1="100" x2="125" y2="145" stroke="currentColor" strokeWidth="1" />
            <line x1="150" y1="100" x2="150" y2="145" stroke="currentColor" strokeWidth="1" />
            {/* Tail lights */}
            <rect x="28" y="105" width="12" height="35" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            <rect x="160" y="105" width="12" height="35" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Bumper */}
            <rect x="20" y="155" width="160" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" rx="5" />
            {/* Dual axle tires */}
            <rect x="10" y="168" width="35" height="18" fill="currentColor" rx="4" />
            <rect x="45" y="168" width="35" height="18" fill="currentColor" rx="4" />
            <rect x="120" y="168" width="35" height="18" fill="currentColor" rx="4" />
            <rect x="155" y="168" width="35" height="18" fill="currentColor" rx="4" />
          </g>
        );
      
      case 'left':
      case 'right':
        const isLeft = view === 'left';
        return (
          <g transform={isLeft ? '' : 'translate(200, 0) scale(-1, 1)'}>
            {/* Body - long */}
            <rect x="15" y="30" width="170" height="80" fill="none" stroke="currentColor" strokeWidth="2" rx="5" />
            {/* Windshield */}
            <path
              d="M170 35 L175 35 Q182 35 183 45 L185 80 L175 80 L170 80 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Windows row */}
            <rect x="40" y="38" width="25" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <rect x="68" y="38" width="25" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <rect x="96" y="38" width="25" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <rect x="124" y="38" width="25" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            <rect x="152" y="38" width="18" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
            {/* Destination sign */}
            <rect x="155" y="33" width="15" height="10" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            {/* Doors */}
            <rect x="25" y="45" width="12" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            <rect x="140" y="70" width="15" height="38" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Wheel arches */}
            <path d="M35 110 Q55 85 75 110" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M145 110 Q165 85 185 110" fill="none" stroke="currentColor" strokeWidth="2" />
            {/* Tires */}
            <circle cx="55" cy="120" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="55" cy="120" r="12" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="165" cy="120" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="165" cy="120" r="12" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Headlight */}
            <rect x="180" y="55" width="8" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Taillight */}
            <rect x="12" y="50" width="6" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="1" />
            {/* Mirror */}
            <ellipse cx="178" cy="40" rx="5" ry="10" fill="none" stroke="currentColor" strokeWidth="1" />
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
