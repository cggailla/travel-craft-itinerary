import React, { useState } from 'react';
import { Key, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setOpenAIKey, getOpenAIKey } from '@/services/openaiService';
import { useToast } from '@/hooks/use-toast';

interface OpenAIKeySetupProps {
  onKeySet: () => void;
}

export const OpenAIKeySetup: React.FC<OpenAIKeySetupProps> = ({ onKeySet }) => {
  const [apiKey, setApiKey] = useState(getOpenAIKey() || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Clé API requise",
        description: "Veuillez entrer votre clé API OpenAI.",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast({
        title: "Format invalide",
        description: "La clé API OpenAI doit commencer par 'sk-'.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Test the API key with a simple request
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      });

      if (!testResponse.ok) {
        throw new Error('Clé API invalide');
      }

      setOpenAIKey(apiKey.trim());
      
      toast({
        title: "Clé API configurée",
        description: "La clé OpenAI a été enregistrée avec succès.",
      });
      
      onKeySet();
    } catch (error) {
      toast({
        title: "Erreur de validation",
        description: "Impossible de valider la clé API. Vérifiez qu'elle est correcte.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Key className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Configuration OpenAI</CardTitle>
        <CardDescription>
          Configurez votre clé API OpenAI pour activer le parsing intelligent des documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apikey">Clé API OpenAI</Label>
          <Input
            id="apikey"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Votre clé est stockée localement et sécurisée. 
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              Obtenir une clé API →
            </a>
          </p>
        </div>
        
        <Button 
          onClick={handleSaveKey} 
          disabled={isLoading || !apiKey.trim()}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Validation...' : 'Enregistrer la clé'}
        </Button>
      </CardContent>
    </Card>
  );
};