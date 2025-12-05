import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, Book, ArrowRight } from "lucide-react";

interface OutputTypeChoiceProps {
  tripId: string;
  onChoiceSelected: (type: 'quote' | 'booklet') => void;
}

export function OutputTypeChoice({ tripId, onChoiceSelected }: OutputTypeChoiceProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Félicitations ! Votre voyage est validé 🎉</CardTitle>
          <CardDescription className="text-lg mt-2">
            Que souhaitez-vous générer maintenant ?
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Option Devis */}
        <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary">
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Devis</CardTitle>
            <CardDescription className="text-base">
              Générer un devis professionnel pour présenter votre voyage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Le devis inclut :
            </p>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Présentation claire du programme</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Pourquoi réserver avec AD Gentes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Avis clients et FAQ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Mise en page professionnelle</span>
              </li>
            </ul>
            <Button 
              className="w-full mt-4 gap-2 group-hover:bg-primary group-hover:text-primary-foreground"
              size="lg"
              onClick={() => {
                window.location.href = `/quote?tripId=${tripId}&autoGenerate=true`;
              }}
            >
              Générer le devis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Option Carnet */}
        <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-secondary">
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <Book className="h-8 w-8 text-secondary" />
            </div>
            <CardTitle className="text-2xl">Carnet de voyage</CardTitle>
            <CardDescription className="text-base">
              Générer un carnet détaillé pour vos voyageurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Le carnet inclut :
            </p>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-secondary mt-0.5">✓</span>
                <span>Programme détaillé jour par jour</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-secondary mt-0.5">✓</span>
                <span>Informations pratiques complètes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-secondary mt-0.5">✓</span>
                <span>Contacts d'urgence</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-secondary mt-0.5">✓</span>
                <span>Photos et illustrations</span>
              </li>
            </ul>
            <Button 
              className="w-full mt-4 gap-2 group-hover:bg-secondary group-hover:text-secondary-foreground"
              variant="secondary"
              size="lg"
              onClick={() => {
                window.location.href = `/booklet?tripId=${tripId}&autoGenerate=true`;
              }}
            >
              Générer le carnet
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
