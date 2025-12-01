import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface SignatureDisplayProps {
  signatureUrl: string;
  signerName?: string;
  signedAt?: string;
  compact?: boolean;
}

export const SignatureDisplay = ({ 
  signatureUrl, 
  signerName,
  signedAt,
  compact = false
}: SignatureDisplayProps) => {
  return (
    <Card className={compact ? "p-3" : "p-4"}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="font-medium">Signature Vérifiée</span>
        </div>
        
        <div className={`bg-white rounded border border-border ${compact ? 'p-2' : 'p-4'}`}>
          <img 
            src={signatureUrl} 
            alt="Signature" 
            className={`w-full ${compact ? 'h-16' : 'h-24'} object-contain`}
          />
        </div>
        
        {(signerName || signedAt) && (
          <div className="text-xs text-muted-foreground space-y-1">
            {signerName && <p>Signé par: <span className="font-medium">{signerName}</span></p>}
            {signedAt && <p>Date: <span className="font-medium">{signedAt}</span></p>}
          </div>
        )}
      </div>
    </Card>
  );
};
