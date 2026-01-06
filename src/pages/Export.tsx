import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const TABLES = [
  // === Général ===
  { name: 'locations', label: 'Locations (Camps)', description: 'Tous les camps et entrepôts', category: 'general' },
  { name: 'personnel', label: 'Personnel', description: 'Liste du personnel militaire', category: 'general' },
  { name: 'profiles', label: 'Profils Utilisateurs', description: 'Comptes utilisateurs', category: 'general' },
  { name: 'user_roles', label: 'Rôles Utilisateurs', description: 'Attribution des rôles', category: 'general' },
  { name: 'djibouti_holidays', label: 'Jours Fériés', description: 'Calendrier des jours fériés Djibouti', category: 'general' },
  
  // === Stock & Inventaire ===
  { name: 'stock_items', label: 'Articles Stock', description: 'Catalogue des articles (Habillement & Alimentaire)', category: 'stock' },
  { name: 'item_variants', label: 'Variantes Articles', description: 'Variantes par taille, couleur, genre', category: 'stock' },
  { name: 'inventory_batches', label: 'Lots Inventaire', description: 'Lots alimentaires avec dates expiration', category: 'stock' },
  { name: 'allocations', label: 'Allocations', description: 'Dotations et prêts au personnel', category: 'stock' },
  { name: 'requests', label: 'Demandes', description: 'Demandes des camps', category: 'stock' },
  
  // === Approvisionnement ===
  { name: 'suppliers', label: 'Fournisseurs', description: 'Liste des fournisseurs', category: 'procurement' },
  { name: 'procurement_orders', label: 'Commandes', description: 'Commandes d\'approvisionnement', category: 'procurement' },
  { name: 'procurement_order_items', label: 'Articles Commandes', description: 'Détails des articles commandés', category: 'procurement' },
  { name: 'procurement_quotes', label: 'Devis', description: 'Devis fournisseurs', category: 'procurement' },
  { name: 'procurement_stage_history', label: 'Historique Étapes', description: 'Historique des changements d\'étape', category: 'procurement' },
  
  // === Parc Automobile - Véhicules ===
  { name: 'vehicles', label: 'Véhicules', description: 'Liste des véhicules du parc', category: 'fleet' },
  { name: 'vehicle_authorized_drivers', label: 'Conducteurs Autorisés', description: 'Affectation conducteurs aux véhicules', category: 'fleet' },
  { name: 'vehicle_documents', label: 'Documents Véhicules', description: 'Assurances, cartes grises, contrôles techniques', category: 'fleet' },
  
  // === Parc Automobile - Entretiens & Réparations ===
  { name: 'vehicle_maintenances', label: 'Entretiens Réalisés', description: 'Historique des entretiens effectués', category: 'fleet' },
  { name: 'maintenance_schedules', label: 'Planification Entretiens', description: 'Entretiens programmés à venir', category: 'fleet' },
  { name: 'vehicle_repairs', label: 'Réparations', description: 'Réparations légères et lourdes', category: 'fleet' },
  
  // === Parc Automobile - Garage ===
  { name: 'vehicle_garage_intakes', label: 'Entrées Garage', description: 'Réception des véhicules au garage', category: 'fleet' },
  { name: 'vehicle_exits', label: 'Sorties Garage', description: 'Libération des véhicules après travaux', category: 'fleet' },
  { name: 'vehicle_diagnostics', label: 'Diagnostics', description: 'Diagnostics mécaniques des véhicules', category: 'fleet' },
  { name: 'vehicle_diagnostic_items', label: 'Éléments Diagnostics', description: 'Détails des points de diagnostic', category: 'fleet' },
  { name: 'diagnostic_categories', label: 'Catégories Diagnostics', description: 'Types de contrôles diagnostiques', category: 'fleet' },
  { name: 'diagnostic_options', label: 'Options Diagnostics', description: 'Points de contrôle par catégorie', category: 'fleet' },
  
  // === Parc Automobile - État des véhicules ===
  { name: 'vehicle_body_damages', label: 'Dommages Carrosserie', description: 'Relevé des dégâts sur la carrosserie', category: 'fleet' },
  { name: 'vehicle_inspection_items', label: 'Éléments Inspection', description: 'Points d\'inspection véhicule', category: 'fleet' },
  { name: 'vehicle_incidents', label: 'Incidents', description: 'Accidents et sinistres déclarés', category: 'fleet' },
  
  // === Parc Automobile - Carburant ===
  { name: 'vehicle_fuel_logs', label: 'Consommation Carburant', description: 'Historique des pleins de carburant', category: 'fleet' },
  
  // === Parc Automobile - Pièces détachées ===
  { name: 'spare_parts', label: 'Pièces Détachées', description: 'Stock de pièces pour réparations', category: 'fleet' },
  { name: 'spare_parts_requests', label: 'Demandes Pièces', description: 'Demandes de pièces détachées', category: 'fleet' },
  { name: 'vehicle_repair_parts', label: 'Pièces Réparations', description: 'Pièces utilisées dans les réparations', category: 'fleet' },
  
  // === Sécurité ===
  { name: 'exceptional_access_requests', label: 'Demandes Accès Urgence', description: 'Demandes d\'accès exceptionnel', category: 'security' },
  { name: 'exceptional_submission_access', label: 'Accès Exceptionnels', description: 'Accès urgence accordés', category: 'security' },
  { name: 'suspicious_activities', label: 'Activités Suspectes', description: 'Alertes de sécurité', category: 'security' },
  { name: 'security_audit_log', label: 'Journal Audit', description: 'Logs des actions utilisateurs', category: 'security' },
];

// Définition des requêtes avec relations pour l'export JSON
const RELATIONS_QUERIES: Record<string, string> = {
  // Général
  locations: '*',
  personnel: '*, location:locations(nom, code)',
  profiles: '*',
  user_roles: '*, location:locations(nom, code)',
  djibouti_holidays: '*',
  
  // Stock
  stock_items: '*',
  item_variants: '*, stock_item:stock_items(type, sous_type, categorie), location:locations(nom, code)',
  inventory_batches: '*, item_variant:item_variants(taille, couleur, genre, stock_item:stock_items(type, sous_type)), location:locations(nom, code), supplier:suppliers(name, code)',
  allocations: '*, personnel:personnel(nom, prenom, matricule, grade), item_variant:item_variants(taille, couleur, genre, stock_item:stock_items(type, sous_type))',
  requests: '*, stock_item:stock_items(type, sous_type, categorie), location:locations(nom, code)',
  
  // Approvisionnement
  suppliers: '*',
  procurement_orders: '*, supplier:suppliers(name, code, country), location:locations(nom, code), items:procurement_order_items(quantity_ordered, unit_price, stock_item:stock_items(type, sous_type))',
  procurement_order_items: '*, order:procurement_orders(order_number, stage), stock_item:stock_items(type, sous_type, categorie)',
  procurement_quotes: '*, order:procurement_orders(order_number), supplier:suppliers(name, code)',
  procurement_stage_history: '*, order:procurement_orders(order_number)',
  
  // Parc Automobile - Véhicules
  vehicles: '*, location:locations(nom, code), conducteur_principal:personnel(nom, prenom, matricule)',
  vehicle_authorized_drivers: '*, vehicle:vehicles(immatriculation, marque, modele), personnel:personnel(nom, prenom, matricule)',
  vehicle_documents: '*, vehicle:vehicles(immatriculation, marque, modele)',
  
  // Parc Automobile - Entretiens & Réparations
  vehicle_maintenances: '*, vehicle:vehicles(immatriculation, marque, modele), effectue_par:personnel(nom, prenom)',
  maintenance_schedules: '*, vehicle:vehicles(immatriculation, marque, modele)',
  vehicle_repairs: '*, vehicle:vehicles(immatriculation, marque, modele), diagnostic:vehicle_diagnostics(diagnostic_resume, statut)',
  
  // Parc Automobile - Garage
  vehicle_garage_intakes: '*, vehicle:vehicles(immatriculation, marque, modele), conducteur:personnel(nom, prenom, matricule)',
  vehicle_exits: '*, vehicle:vehicles(immatriculation, marque, modele), conducteur:personnel(nom, prenom), intake:vehicle_garage_intakes(motif, date_arrivee)',
  vehicle_diagnostics: '*, intake:vehicle_garage_intakes(motif, vehicle:vehicles(immatriculation, marque, modele)), mecanicien:personnel(nom, prenom)',
  vehicle_diagnostic_items: '*, diagnostic:vehicle_diagnostics(statut, diagnostic_resume), option:diagnostic_options(nom, category:diagnostic_categories(nom))',
  diagnostic_categories: '*',
  diagnostic_options: '*, category:diagnostic_categories(nom)',
  
  // Parc Automobile - État des véhicules
  vehicle_body_damages: '*, vehicle:vehicles(immatriculation, marque, modele), intake:vehicle_garage_intakes(motif, date_arrivee)',
  vehicle_inspection_items: '*, vehicle:vehicles(immatriculation, marque, modele), intake:vehicle_garage_intakes(motif)',
  vehicle_incidents: '*, vehicle:vehicles(immatriculation, marque, modele), conducteur_responsable:personnel(nom, prenom, matricule)',
  
  // Parc Automobile - Carburant
  vehicle_fuel_logs: '*, vehicle:vehicles(immatriculation, marque, modele), conducteur:personnel(nom, prenom, matricule), location:locations(nom, code)',
  
  // Parc Automobile - Pièces détachées
  spare_parts: '*, recovered_from_vehicle:vehicles(immatriculation, marque, modele)',
  spare_parts_requests: '*, vehicle:vehicles(immatriculation, marque, modele), spare_part:spare_parts(nom, reference), diagnostic:vehicle_diagnostics(diagnostic_resume)',
  vehicle_repair_parts: '*, repair:vehicle_repairs(description, vehicle:vehicles(immatriculation)), spare_part:spare_parts(nom, reference)',
  
  // Sécurité
  exceptional_access_requests: '*, location:locations(nom, code)',
  exceptional_submission_access: '*, location:locations(nom, code)',
  suspicious_activities: '*',
  security_audit_log: '*',
};

const Export = () => {
  const navigate = useNavigate();
  const [selectedTables, setSelectedTables] = useState<string[]>(TABLES.map(t => t.name));
  const [loading, setLoading] = useState(false);
  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<'csv' | 'json'>('csv');

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAll = () => setSelectedTables(TABLES.map(t => t.name));
  const deselectAll = () => setSelectedTables([]);

  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(';'),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
          const stringValue = String(value);
          if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(';')
      )
    ];
    return csvRows.join('\n');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: `${type};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportTableCSV = async (tableName: string) => {
    setExportingTable(tableName);
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info(`Table ${tableName} est vide`);
        return;
      }

      const csv = convertToCSV(data);
      const date = new Date().toISOString().split('T')[0];
      downloadFile(csv, `${tableName}_${date}.csv`, 'text/csv');
      toast.success(`${tableName} exporté (${data.length} lignes)`);
    } catch (error: any) {
      console.error(`Erreur export ${tableName}:`, error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setExportingTable(null);
    }
  };

  const exportTableJSON = async (tableName: string) => {
    setExportingTable(tableName);
    try {
      const query = RELATIONS_QUERIES[tableName] || '*';
      const { data, error } = await supabase
        .from(tableName as any)
        .select(query);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info(`Table ${tableName} est vide`);
        return;
      }

      const json = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().split('T')[0];
      downloadFile(json, `${tableName}_relations_${date}.json`, 'application/json');
      toast.success(`${tableName} exporté avec relations (${data.length} lignes)`);
    } catch (error: any) {
      console.error(`Erreur export ${tableName}:`, error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setExportingTable(null);
    }
  };

  const exportTable = (tableName: string) => {
    if (exportMode === 'csv') {
      exportTableCSV(tableName);
    } else {
      exportTableJSON(tableName);
    }
  };

  const exportSelectedCSV = async () => {
    if (selectedTables.length === 0) {
      toast.warning('Sélectionnez au moins une table');
      return;
    }

    setLoading(true);
    const date = new Date().toISOString().split('T')[0];
    let successCount = 0;

    for (const tableName of selectedTables) {
      setExportingTable(tableName);
      try {
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*');
        
        if (error) {
          console.error(`Erreur ${tableName}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          const csv = convertToCSV(data);
          downloadFile(csv, `${tableName}_${date}.csv`, 'text/csv');
          successCount++;
        }
      } catch (error) {
        console.error(`Erreur export ${tableName}:`, error);
      }
    }

    setExportingTable(null);
    setLoading(false);
    toast.success(`${successCount} tables CSV exportées`);
  };

  const exportAllJSON = async () => {
    if (selectedTables.length === 0) {
      toast.warning('Sélectionnez au moins une table');
      return;
    }

    setLoading(true);
    const date = new Date().toISOString().split('T')[0];
    const allData: Record<string, any[]> = {};
    let successCount = 0;

    for (const tableName of selectedTables) {
      setExportingTable(tableName);
      try {
        const query = RELATIONS_QUERIES[tableName] || '*';
        const { data, error } = await supabase
          .from(tableName as any)
          .select(query);
        
        if (error) {
          console.error(`Erreur ${tableName}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          allData[tableName] = data;
          successCount++;
        }
      } catch (error) {
        console.error(`Erreur export ${tableName}:`, error);
      }
    }

    // Export un seul fichier JSON avec toutes les tables
    const json = JSON.stringify({
      exportDate: new Date().toISOString(),
      tables: allData,
      metadata: {
        totalTables: successCount,
        tablesIncluded: Object.keys(allData),
      }
    }, null, 2);
    
    downloadFile(json, `sentinel_full_export_${date}.json`, 'application/json');

    setExportingTable(null);
    setLoading(false);
    toast.success(`Export JSON complet: ${successCount} tables avec relations`);
  };

  const exportSelected = () => {
    if (exportMode === 'csv') {
      exportSelectedCSV();
    } else {
      exportAllJSON();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Export des Données</h1>
            <p className="text-muted-foreground">Téléchargez les données en format CSV ou JSON</p>
          </div>
        </motion.div>

        {/* Tabs pour choisir le format */}
        <Tabs value={exportMode} onValueChange={(v) => setExportMode(v as 'csv' | 'json')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              CSV (Tables séparées)
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              JSON (Avec relations)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="mb-6 border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {exportMode === 'csv' ? (
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              ) : (
                <FileJson className="h-5 w-5 text-emerald-500" />
              )}
              {exportMode === 'csv' ? 'Export CSV' : 'Export JSON avec Relations'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {exportMode === 'csv' 
                ? 'Export des tables en fichiers CSV séparés (sans relations)'
                : 'Export complet en un seul fichier JSON avec toutes les relations entre tables'
              }
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={selectAll} variant="outline" size="sm">
              Tout sélectionner
            </Button>
            <Button onClick={deselectAll} variant="outline" size="sm">
              Tout désélectionner
            </Button>
            <Button 
              onClick={exportSelected} 
              disabled={loading || selectedTables.length === 0}
              className={`ml-auto ${exportMode === 'json' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {exportMode === 'csv' 
                    ? `Exporter CSV (${selectedTables.length})`
                    : `Exporter JSON complet (${selectedTables.length})`
                  }
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {TABLES.map((table, index) => (
            <motion.div
              key={table.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card 
                className={`transition-all cursor-pointer hover:border-primary/50 ${
                  selectedTables.includes(table.name) 
                    ? exportMode === 'json' 
                      ? 'border-emerald-500/30 bg-emerald-500/5' 
                      : 'border-primary/30 bg-primary/5' 
                    : 'bg-card/30'
                }`}
                onClick={() => toggleTable(table.name)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <Checkbox 
                    checked={selectedTables.includes(table.name)}
                    onCheckedChange={() => toggleTable(table.name)}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{table.label}</h3>
                    <p className="text-sm text-muted-foreground">{table.description}</p>
                    {exportMode === 'json' && RELATIONS_QUERIES[table.name] !== '*' && (
                      <p className="text-xs text-emerald-500 mt-1">
                        ✓ Inclut les relations
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTable(table.name);
                    }}
                    disabled={exportingTable === table.name}
                  >
                    {exportingTable === table.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Export;
