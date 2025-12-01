import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  title?: string;
  subtitle?: string;
  size?: number;
}

export const QRCodeGenerator = ({ 
  value, 
  title, 
  subtitle,
  size = 200 
}: QRCodeGeneratorProps) => {
  const downloadQR = () => {
    const svg = document.getElementById(`qr-${value}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-code-${value.slice(0, 8)}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-lg border border-border bg-card">
      {title && (
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      
      <div className="p-4 bg-white rounded-lg">
        <QRCode
          id={`qr-${value}`}
          value={value}
          size={size}
          level="H"
        />
      </div>
      
      <Button onClick={downloadQR} variant="outline" className="gap-2">
        <Download className="h-4 w-4" />
        Télécharger QR Code
      </Button>
      
      <p className="text-xs text-muted-foreground font-mono">
        ID: {value.slice(0, 8)}...
      </p>
    </div>
  );
};
