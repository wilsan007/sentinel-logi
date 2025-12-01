import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface DigitalSignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export const DigitalSignaturePad = ({ 
  onSave, 
  onCancel,
  title = "Signature Numérique",
  subtitle = "Veuillez signer dans le cadre ci-dessous"
}: DigitalSignaturePadProps) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    signatureRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (signatureRef.current?.isEmpty()) {
      return;
    }
    
    // Get signature as base64 PNG
    const signatureData = signatureRef.current?.toDataURL('image/png');
    if (signatureData) {
      onSave(signatureData);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
          <p className="text-sm text-muted-foreground text-center">{subtitle}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: 'w-full h-64 cursor-crosshair',
              }}
              backgroundColor="white"
              penColor="black"
              minWidth={1}
              maxWidth={3}
              onBegin={handleBegin}
            />
          </div>
          
          <div className="flex justify-between gap-2">
            <Button 
              onClick={handleClear} 
              variant="outline"
              className="gap-2"
              disabled={isEmpty}
            >
              <Eraser className="h-4 w-4" />
              Effacer
            </Button>
            
            <div className="flex gap-2">
              <Button 
                onClick={onCancel} 
                variant="ghost"
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Annuler
              </Button>
              
              <Button 
                onClick={handleSave}
                disabled={isEmpty}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Confirmer Signature
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
