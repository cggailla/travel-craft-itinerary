import { useState } from "react";
import { EditableText } from "./EditableText";

interface ThankYouSectionProps {
  greeting?: string;
}

export function ThankYouSection({ greeting = "Chers voyageurs" }: ThankYouSectionProps) {
  const [editableGreeting, setEditableGreeting] = useState(greeting);
  const [para1, setPara1] = useState("Je tiens à vous remercier sincèrement d'avoir fait confiance à notre agence pour l'organisation de votre voyage. J'espère que ce séjour vous a apporté d'émerveillement, de découvertes et de belles émotions en famille, et que vous en garderez de précieux souvenirs.");
  const [para2, setPara2] = useState("N'hésitez pas à me faire part de vos impressions : vos retours sont essentiels pour continuer à améliorer nos services et proposer des expériences toujours plus personnalisées. Je reste bien entendu à votre disposition pour toute question ou pour vous accompagner dans la planification de vos prochaines escapades.");
  const [para3, setPara3] = useState("Au plaisir de vous retrouver pour une nouvelle aventure !");
  const [closing, setClosing] = useState("Bien à vous,");

  return (
    <div className="my-8 space-y-3 text-sm leading-relaxed">
      <p>
        <EditableText
          value={editableGreeting}
          onChange={setEditableGreeting}
          className="font-medium inline"
          as="span"
          inline
        />
        ,
      </p>
      
      <EditableText
        value={para1}
        onChange={setPara1}
        multiline
        as="p"
      />
      
      <EditableText
        value={para2}
        onChange={setPara2}
        multiline
        as="p"
      />
      
      <EditableText
        value={para3}
        onChange={setPara3}
        as="p"
      />
      
      <EditableText
        value={closing}
        onChange={setClosing}
        className="font-medium"
        as="p"
      />
    </div>
  );
}
