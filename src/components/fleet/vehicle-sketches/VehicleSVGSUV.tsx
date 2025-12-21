import React from 'react';

interface VehicleSVGProps {
  view: 'top' | 'front' | 'rear' | 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export const VehicleSVGSUV: React.FC<VehicleSVGProps> = ({ view, className, onClick }) => {
  const renderView = () => {
    switch (view) {
      case 'top':
        return (
          <g>
            {/* Body outline */}
            <path
              d="M45 10 L155 10 Q175 10 180 30 L185 75 L185 125 L180 170 Q175 190 155 190 L45 190 Q25 190 20 170 L15 125 L15 75 L20 30 Q25 10 45 10 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield */}
            <path
              d="M50 30 L150 30 Q160 30 160 40 L160 55 L40 55 L40 40 Q40 30 50 30 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Rear window */}
            <path
              d="M50 160 L150 160 Q160 160 160 150 L160 135 L40 135 L40 150 Q40 160 50 160 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Roof */}
            <rect x="40" y="55" width="120" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" rx="5" />
            {/* Roof rails */}
            <line x1="45" y1="60" x2="45" y2="130" stroke="currentColor" strokeWidth="2" />
            <line x1="155" y1="60" x2="155" y2="130" stroke="currentColor" strokeWidth="2" />
            {/* Tires - larger for SUV */}
            <rect x="5" y="35" width="18" height="40" fill="currentColor" rx="4" />
            <rect x="177" y="35" width="18" height="40" fill="currentColor" rx="4" />
            <rect x="5" y="125" width="18" height="40" fill="currentColor" rx="4" />
            <rect x="177" y="125" width="18" height="40" fill="currentColor" rx="4" />
            {/* Side mirrors */}
            <ellipse cx="10" cy="50" rx="10" ry="6" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="190" cy="50" rx="10" ry="6" fill="none" stroke="currentColor" strokeWidth="1" />
          </g>
        );
      
      case 'front':
        return (
          <g>
            {/* Body - taller for SUV */}
            <path
              d="M25 135 L25 75 Q25 35 60 30 L140 30 Q175 35 175 75 L175 135 Q175 160 165 170 L35 170 Q25 160 25 135 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windshield */}
            <path
              d="M45 40 L155 40 Q165 40 165 55 L165 80 L35 80 L35 55 Q35 40 45 40 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Grille */}
            <rect x="55" y="120" width="90" height="25" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Headlights */}
            <rect x="30" y="105" width="28" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" rx="5" />
            <rect x="142" y="105" width="28" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" rx="5" />
            {/* Bull bar */}
            <path
              d="M40 150 L160 150 L165 160 L35 160 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Bumper */}
            <path
              d="M20 160 L180 160 Q185 160 185 170 L185 185 L15 185 L15 170 Q15 160 20 160 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Tires - larger */}
            <rect x="10" y="175" width="45" height="20" fill="currentColor" rx="5" />
            <rect x="145" y="175" width="45" height="20" fill="currentColor" rx="5" />
            {/* Roof rails visible */}
            <line x1="30" y1="30" x2="30" y2="25" stroke="currentColor" strokeWidth="3" />
            <line x1="170" y1="30" x2="170" y2="25" stroke="currentColor" strokeWidth="3" />
          </g>
        );
      
      case 'rear':
        return (
          <g>
            {/* Body - taller */}
            <path
              d="M25 135 L25 75 Q25 35 60 30 L140 30 Q175 35 175 75 L175 135 Q175 160 165 170 L35 170 Q25 160 25 135 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Rear window */}
            <path
              d="M45 40 L155 40 Q165 40 165 55 L165 80 L35 80 L35 55 Q35 40 45 40 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Tailgate */}
            <rect x="40" y="85" width="120" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Spare tire mount */}
            <circle cx="100" cy="115" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="115" r="12" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Tail lights */}
            <rect x="30" y="100" width="15" height="35" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            <rect x="155" y="100" width="15" height="35" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
            {/* Bumper */}
            <path
              d="M20 155 L180 155 Q185 155 185 165 L185 180 L15 180 L15 165 Q15 155 20 155 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Tires */}
            <rect x="10" y="170" width="45" height="20" fill="currentColor" rx="5" />
            <rect x="145" y="170" width="45" height="20" fill="currentColor" rx="5" />
          </g>
        );
      
      case 'left':
      case 'right':
        const isLeft = view === 'left';
        return (
          <g transform={isLeft ? '' : 'translate(200, 0) scale(-1, 1)'}>
            {/* Body - higher ground clearance */}
            <path
              d="M20 100 L20 85 Q20 45 55 40 L75 35 L125 35 Q150 35 155 45 L170 75 L180 75 L180 110 L175 120 L25 120 L20 110 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Windows */}
            <path
              d="M55 42 L75 38 L125 38 Q145 38 150 48 L162 75 L55 75 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Window pillars */}
            <line x1="90" y1="42" x2="90" y2="75" stroke="currentColor" strokeWidth="2" />
            <line x1="125" y1="42" x2="125" y2="75" stroke="currentColor" strokeWidth="2" />
            {/* Roof rail */}
            <line x1="55" y1="38" x2="150" y2="38" stroke="currentColor" strokeWidth="3" />
            {/* Door lines */}
            <line x1="90" y1="48" x2="90" y2="110" stroke="currentColor" strokeWidth="1" />
            <line x1="130" y1="50" x2="130" y2="110" stroke="currentColor" strokeWidth="1" />
            {/* Door handles */}
            <rect x="100" y="85" width="15" height="5" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            <rect x="140" y="85" width="15" height="5" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
            {/* Wheel arches - more pronounced */}
            <path d="M30 120 Q45 100 60 120" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M135 120 Q150 100 165 120" fill="none" stroke="currentColor" strokeWidth="2" />
            {/* Tires - larger */}
            <circle cx="50" cy="135" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="135" r="16" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="150" cy="135" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="150" cy="135" r="16" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Headlight */}
            <rect x="172" y="80" width="10" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Taillight */}
            <rect x="18" y="85" width="8" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            {/* Side mirror */}
            <ellipse cx="62" cy="45" rx="6" ry="10" fill="none" stroke="currentColor" strokeWidth="1" />
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
