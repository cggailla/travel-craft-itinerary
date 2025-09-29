interface ThankYouSectionProps {
  greeting?: string;
}

export function ThankYouSection({ greeting = "Chers voyageurs" }: ThankYouSectionProps) {
  return (
    <div className="my-8 p-6 bg-accent/30 rounded-lg border-l-4 border-primary">
      <div className="space-y-4 text-base leading-relaxed">
        <p className="font-medium">{greeting},</p>
        
        <p>
          Je tiens à vous remercier sincèrement d'avoir fait confiance à notre agence pour 
          l'organisation de votre voyage. J'espère que ce séjour vous a apporté d'émerveillement, 
          de découvertes et de belles émotions en famille, et que vous en garderez de précieux souvenirs.
        </p>
        
        <p>
          N'hésitez pas à me faire part de vos impressions : vos retours sont essentiels pour 
          continuer à améliorer nos services et proposer des expériences toujours plus personnalisées. 
          Je reste bien entendu à votre disposition pour toute question ou pour vous accompagner 
          dans la planification de vos prochaines escapades.
        </p>
        
        <p>Au plaisir de vous retrouver pour une nouvelle aventure !</p>
        
        <p className="font-medium">Bien à vous,</p>
      </div>
    </div>
  );
}
