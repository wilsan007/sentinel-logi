import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  placeholder?: string;
  label?: string;
}

export const QRScanner = ({ 
  onScan, 
  placeholder = "Entrez ou scannez le code QR",
  label = "Code QR"
}: QRScannerProps) => {
  const [qrInput, setQrInput] = useState('');

  const handleScan = () => {
    if (!qrInput.trim()) {
      toast.error("Veuillez entrer un code QR valide");
      return;
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(qrInput.trim())) {
      toast.error("Format de code QR invalide");
      return;
    }
    
    onScan(qrInput.trim());
    setQrInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          {label}
        </label>
      )}
      
      <div className="flex gap-2">
        <Input
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
        <Button onClick={handleScan} size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
