import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const TABLES = [
  { name: 'locations', label: 'Locations (Camps)', description: 'Tous les camps et entrepôts' },
  { name: 'personnel', label: 'Personnel', description: 'Liste du personnel militaire' },
  { name: 'stock_items', label: 'Articles Stock', description: 'Catalogue des articles (Habillement & Alimentaire)' },
  { name: 'item_variants', label: 'Variantes Articles', description: 'Variantes par taille, couleur, genre' },
  { name: 'inventory_batches', label: 'Lots Inventaire', description: 'Lots alimentaires avec dates expiration' },
  { name: 'allocations', label: 'Allocations', description: 'Dotations et prêts au personnel' },
  { name: 'suppliers', label: 'Fournisseurs', description: 'Liste des fournisseurs' },
  { name: 'procurement_orders', label: 'Commandes', description: 'Commandes d\'approvisionnement' },
  { name: 'procurement_order_items', label: 'Articles Commandes', description: 'Détails des articles commandés' },
  { name: 'procurement_quotes', label: 'Devis', description: 'Devis fournisseurs' },
  { name: 'procurement_stage_history', label: 'Historique Étapes', description: 'Historique des changements d\'étape' },
  { name: 'requests', label: 'Demandes', description: 'Demandes des camps' },
  { name: 'profiles', label: 'Profils Utilisateurs', description: 'Comptes utilisateurs' },
  { name: 'user_roles', label: 'Rôles Utilisateurs', description: 'Attribution des rôles' },
  { name: 'djibouti_holidays', label: 'Jours Fériés', description: 'Calendrier des jours fériés Djibouti' },
  { name: 'exceptional_access_requests', label: 'Demandes Accès Urgence', description: 'Demandes d\'accès exceptionnel' },
  { name: 'exceptional_submission_access', label: 'Accès Exceptionnels', description: 'Accès urgence accordés' },
  { name: 'suspicious_activities', label: 'Activités Suspectes', description: 'Alertes de sécurité' },
];

const Export = () => {
  const navigate = useNavigate();
  const [selectedTables, setSelectedTables] = useState<string[]>(TABLES.map(t => t.name));
  const [loading, setLoading] = useState(false);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAll = () => setSelectedTables(TABLES.map(t => t.name));
  const deselectAll = () => setSelectedTables([]);

  const convertToCSV = (data: any[], tableName: string): string => {
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

  const downloadCSV = (csv: string, filename: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportTable = async (tableName: string) => {
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

      const csv = convertToCSV(data, tableName);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `${tableName}_${date}.csv`);
      toast.success(`${tableName} exporté (${data.length} lignes)`);
    } catch (error: any) {
      console.error(`Erreur export ${tableName}:`, error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setExportingTable(null);
    }
  };

  const exportSelected = async () => {
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
          const csv = convertToCSV(data, tableName);
          downloadCSV(csv, `${tableName}_${date}.csv`);
          successCount++;
        }
      } catch (error) {
        console.error(`Erreur export ${tableName}:`, error);
      }
    }

    setExportingTable(null);
    setLoading(false);
    toast.success(`${successCount} tables exportées avec succès`);
  };

  const exportAll = async () => {
    setSelectedTables(TABLES.map(t => t.name));
    setTimeout(() => exportSelected(), 100);
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
            <p className="text-muted-foreground">Téléchargez les données en format CSV</p>
          </div>
        </motion.div>

        <Card className="mb-6 border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Actions Rapides
            </CardTitle>
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
              className="ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter la sélection ({selectedTables.length})
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
                  selectedTables.includes(table.name) ? 'border-primary/30 bg-primary/5' : 'bg-card/30'
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
