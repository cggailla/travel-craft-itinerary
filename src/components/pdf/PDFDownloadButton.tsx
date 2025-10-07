/**
 * Bouton pour générer et télécharger le PDF avec react-pdf
 */

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { BookletPDF } from './BookletPDF';
import { PDFBookletData } from '@/services/pdfBookletService';

interface PDFDownloadButtonProps {
  bookletData: PDFBookletData;
  disabled?: boolean;
}

export function PDFDownloadButton({ bookletData, disabled }: PDFDownloadButtonProps) {
  const fileName = `carnet-voyage-${bookletData.tripTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`;

  return (
    <PDFDownloadLink
      document={<BookletPDF data={bookletData} />}
      fileName={fileName}
    >
      {({ loading, error }) => (
        <Button
          disabled={loading || disabled}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération du PDF...
            </>
          ) : error ? (
            <>
              <Download className="h-4 w-4" />
              Erreur - Réessayer
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
