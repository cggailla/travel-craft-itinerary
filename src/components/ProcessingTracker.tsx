import React from 'react';
import { CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { ParsedDocument } from '@/types/travel';
import { cn } from '@/lib/utils';

interface ProcessingTrackerProps {
  documents: ParsedDocument[];
  className?: string;
}

export const ProcessingTracker: React.FC<ProcessingTrackerProps> = ({
  documents,
  className
}) => {
  const getStatusIcon = (status: ParsedDocument['processingStatus']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-secondary" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-accent animate-spin" />;
    }
  };

  const getStatusText = (status: ParsedDocument['processingStatus']) => {
    switch (status) {
      case 'completed':
        return 'Traité avec succès';
      case 'error':
        return 'Erreur de traitement';
      default:
        return 'Traitement en cours...';
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-xl p-6', className)}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Travail IA</h3>
          <p className="text-sm text-muted-foreground">
            Analyse et extraction des informations de voyage
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border transition-all duration-300',
              doc.processingStatus === 'completed' && 'bg-secondary/10 border-secondary/30',
              doc.processingStatus === 'error' && 'bg-destructive/10 border-destructive/30',
              doc.processingStatus === 'processing' && 'bg-accent/10 border-accent/30'
            )}
          >
            <div className="flex items-center space-x-3 flex-1">
              {getStatusIcon(doc.processingStatus)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getStatusText(doc.processingStatus)}
                </p>
                {doc.error && (
                  <p className="text-xs text-destructive mt-1">{doc.error}</p>
                )}
              </div>
            </div>
            
            {doc.processingStatus === 'completed' && doc.extractedInfo.type && (
              <div className="flex items-center space-x-2">
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  doc.extractedInfo.type === 'flight' && 'bg-blue-100 text-blue-800',
                  doc.extractedInfo.type === 'hotel' && 'bg-purple-100 text-purple-800',
                  doc.extractedInfo.type === 'activity' && 'bg-green-100 text-green-800',
                  doc.extractedInfo.type === 'car' && 'bg-orange-100 text-orange-800',
                  doc.extractedInfo.type === 'other' && 'bg-gray-100 text-gray-800'
                )}>
                  {doc.extractedInfo.type === 'flight' && 'Vol'}
                  {doc.extractedInfo.type === 'hotel' && 'Hôtel'}
                  {doc.extractedInfo.type === 'activity' && 'Activité'}
                  {doc.extractedInfo.type === 'car' && 'Voiture'}
                  {doc.extractedInfo.type === 'other' && 'Autre'}
                </span>
                {doc.extractedInfo.confidence && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(doc.extractedInfo.confidence * 100)}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>En attente de documents à traiter...</p>
        </div>
      )}
    </div>
  );
};