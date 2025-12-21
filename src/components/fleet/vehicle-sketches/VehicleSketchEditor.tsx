import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Trash2 } from 'lucide-react';
import { 
  VehicleSVGSedan, 
  VehicleSVGPickup, 
  VehicleSVGSUV, 
  VehicleSVGTruck, 
  VehicleSVGBus,
  VehicleSketchType,
  VehicleView,
  DamageMarker,
  DamageType,
  DamageSeverity,
  DAMAGE_TYPES,
  SEVERITY_LEVELS,
  VIEW_LABELS
} from './index';

interface VehicleSketchEditorProps {
  vehicleType: VehicleSketchType;
  damages: DamageMarker[];
  onDamagesChange: (damages: DamageMarker[]) => void;
  readOnly?: boolean;
}

export const VehicleSketchEditor: React.FC<VehicleSketchEditorProps> = ({
  vehicleType,
  damages,
  onDamagesChange,
  readOnly = false
}) => {
  const [activeView, setActiveView] = useState<VehicleView>('top');
  const [selectedDamageType, setSelectedDamageType] = useState<DamageType>('scratch');
  const [selectedSeverity, setSelectedSeverity] = useState<DamageSeverity>('minor');
  const [isPreExisting, setIsPreExisting] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState<string | null>(null);
  const [damageNotes, setDamageNotes] = useState('');
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const getVehicleSVG = (view: VehicleView) => {
    const commonProps = {
      view,
      className: 'w-full h-full text-foreground',
      onClick: readOnly ? undefined : handleSVGClick
    };

    switch (vehicleType) {
      case 'BERLINE':
        return <VehicleSVGSedan {...commonProps} />;
      case 'PICKUP':
        return <VehicleSVGPickup {...commonProps} />;
      case 'SUV':
        return <VehicleSVGSUV {...commonProps} />;
      case 'CAMION':
        return <VehicleSVGTruck {...commonProps} />;
      case 'BUS':
      case 'MINIBUS':
        return <VehicleSVGBus {...commonProps} />;
      default:
        return <VehicleSVGSedan {...commonProps} />;
    }
  };

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newDamage: DamageMarker = {
      id: `damage-${Date.now()}`,
      type: selectedDamageType,
      severity: selectedSeverity,
      view: activeView,
      positionX: x,
      positionY: y,
      notes: '',
      isPreExisting
    };

    onDamagesChange([...damages, newDamage]);
    setSelectedDamage(newDamage.id);
  };

  const handleRemoveDamage = (damageId: string) => {
    onDamagesChange(damages.filter(d => d.id !== damageId));
    if (selectedDamage === damageId) {
      setSelectedDamage(null);
    }
  };

  const handleUpdateDamageNotes = (damageId: string, notes: string) => {
    onDamagesChange(damages.map(d => 
      d.id === damageId ? { ...d, notes } : d
    ));
  };

  const viewDamages = damages.filter(d => d.view === activeView);
  const selectedDamageData = damages.find(d => d.id === selectedDamage);

  const getDamageColor = (type: DamageType) => {
    return DAMAGE_TYPES.find(t => t.value === type)?.color || '#808080';
  };

  const getSeveritySize = (severity: DamageSeverity) => {
    switch (severity) {
      case 'minor': return 12;
      case 'moderate': return 16;
      case 'severe': return 20;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!readOnly && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Outils de marquage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Type de dommage</Label>
                <Select value={selectedDamageType} onValueChange={(v) => setSelectedDamageType(v as DamageType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAMAGE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sévérité</Label>
                <Select value={selectedSeverity} onValueChange={(v) => setSelectedSeverity(v as DamageSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="preExisting" 
                    checked={isPreExisting}
                    onCheckedChange={(checked) => setIsPreExisting(!!checked)}
                  />
                  <Label htmlFor="preExisting" className="text-sm">Dommage préexistant</Label>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Cliquez sur le croquis pour ajouter un marqueur de dommage
            </p>
          </CardContent>
        </Card>
      )}

      {/* Views Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as VehicleView)}>
        <TabsList className="grid grid-cols-5">
          {VIEW_LABELS.map(view => (
            <TabsTrigger key={view.value} value={view.value} className="text-xs">
              {view.label}
              {damages.filter(d => d.view === view.value).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {damages.filter(d => d.view === view.value).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {VIEW_LABELS.map(view => (
          <TabsContent key={view.value} value={view.value}>
            <Card>
              <CardContent className="p-4">
                <div 
                  ref={svgContainerRef}
                  className="relative bg-muted/50 rounded-lg aspect-square max-w-md mx-auto border-2 border-dashed border-muted-foreground/30"
                >
                  {getVehicleSVG(view.value)}
                  
                  {/* Damage markers overlay */}
                  {damages.filter(d => d.view === view.value).map(damage => (
                    <div
                      key={damage.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                        selectedDamage === damage.id ? 'ring-2 ring-primary ring-offset-2' : ''
                      } ${damage.isPreExisting ? 'opacity-70' : ''}`}
                      style={{
                        left: `${damage.positionX}%`,
                        top: `${damage.positionY}%`,
                        width: getSeveritySize(damage.severity),
                        height: getSeveritySize(damage.severity),
                        backgroundColor: getDamageColor(damage.type),
                        borderRadius: '50%',
                        border: damage.isPreExisting ? '2px dashed white' : '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDamage(damage.id);
                      }}
                      title={DAMAGE_TYPES.find(t => t.value === damage.type)?.label}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Damage Details / List */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Dommages enregistrés ({damages.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {damages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun dommage enregistré
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {damages.map(damage => {
                const typeInfo = DAMAGE_TYPES.find(t => t.value === damage.type);
                const severityInfo = SEVERITY_LEVELS.find(s => s.value === damage.severity);
                const viewInfo = VIEW_LABELS.find(v => v.value === damage.view);
                
                return (
                  <div 
                    key={damage.id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      selectedDamage === damage.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => {
                      setSelectedDamage(damage.id);
                      setActiveView(damage.view);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: typeInfo?.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{typeInfo?.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {severityInfo?.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {viewInfo?.label}
                          </Badge>
                          {damage.isPreExisting && (
                            <Badge variant="outline" className="text-xs">
                              Préexistant
                            </Badge>
                          )}
                        </div>
                        {damage.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{damage.notes}</p>
                        )}
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDamage(damage.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes for selected damage */}
          {selectedDamageData && !readOnly && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm">Notes pour ce dommage</Label>
              <Textarea
                value={selectedDamageData.notes || ''}
                onChange={(e) => handleUpdateDamageNotes(selectedDamageData.id, e.target.value)}
                placeholder="Ajouter des notes descriptives..."
                className="mt-2"
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-xs">Légende</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-3">
            {DAMAGE_TYPES.map(type => (
              <div key={type.value} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-xs">{type.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Taille: Petit = Mineur, Moyen = Modéré, Grand = Sévère</span>
            <span>Bordure pointillée = Préexistant</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
