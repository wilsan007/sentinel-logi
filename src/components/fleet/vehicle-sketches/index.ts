export { VehicleSVGSedan } from './VehicleSVGSedan';
export { VehicleSVGPickup } from './VehicleSVGPickup';
export { VehicleSVGSUV } from './VehicleSVGSUV';
export { VehicleSVGTruck } from './VehicleSVGTruck';
export { VehicleSVGBus } from './VehicleSVGBus';

export type VehicleSketchType = 'BERLINE' | 'PICKUP' | 'SUV' | 'CAMION' | 'BUS' | 'MINIBUS' | 'MOTO' | 'AUTRE';
export type VehicleView = 'top' | 'front' | 'rear' | 'left' | 'right';

export interface DamageMarker {
  id: string;
  type: DamageType;
  severity: DamageSeverity;
  view: VehicleView;
  positionX: number;
  positionY: number;
  notes?: string;
  isPreExisting?: boolean;
}

export type DamageType = 
  | 'scratch'      // Rayure
  | 'dent'         // Bosse/Enfoncement
  | 'paint_chip'   // Éclat de peinture
  | 'crack'        // Fissure
  | 'collision'    // Dommage collision
  | 'rust'         // Rouille
  | 'broken_glass' // Vitre cassée
  | 'tire_damage'  // Pneu endommagé
  | 'missing_part' // Pièce manquante
  | 'other';       // Autre

export type DamageSeverity = 'minor' | 'moderate' | 'severe';

export const DAMAGE_TYPES: { value: DamageType; label: string; color: string }[] = [
  { value: 'scratch', label: 'Rayure', color: '#FFA500' },
  { value: 'dent', label: 'Bosse/Enfoncement', color: '#FF6B6B' },
  { value: 'paint_chip', label: 'Éclat de peinture', color: '#FFD93D' },
  { value: 'crack', label: 'Fissure', color: '#C70039' },
  { value: 'collision', label: 'Dommage collision', color: '#900C3F' },
  { value: 'rust', label: 'Rouille', color: '#8B4513' },
  { value: 'broken_glass', label: 'Vitre cassée', color: '#4169E1' },
  { value: 'tire_damage', label: 'Pneu endommagé', color: '#2F4F4F' },
  { value: 'missing_part', label: 'Pièce manquante', color: '#9932CC' },
  { value: 'other', label: 'Autre', color: '#808080' },
];

export const SEVERITY_LEVELS: { value: DamageSeverity; label: string }[] = [
  { value: 'minor', label: 'Mineur' },
  { value: 'moderate', label: 'Modéré' },
  { value: 'severe', label: 'Sévère' },
];

export const VIEW_LABELS: { value: VehicleView; label: string }[] = [
  { value: 'top', label: 'Dessus' },
  { value: 'front', label: 'Avant' },
  { value: 'rear', label: 'Arrière' },
  { value: 'left', label: 'Côté gauche' },
  { value: 'right', label: 'Côté droit' },
];
