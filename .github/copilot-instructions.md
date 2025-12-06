# 📘 Copilot Instructions - Génération Booklet (Export PDF/DOCX)

## 🎯 Objectif
Modifier **uniquement** la brique d'export du booklet (PDF/DOCX). Ne jamais toucher aux autres parties de l'application (upload PDF, extraction, enrichissement IA, validation).

---

## 🏗️ Architecture Simplifiée

### Base de données (PostgreSQL/Supabase)
- **`trips`** : voyage principal (`id`, `title`, `status`)
- **`travel_segments`** : segments validés avec données enrichies (`enriched` JSONB contient le contenu IA pré-généré)
- **`trip_general_info`** : infos pays/climat/santé
- **`travel_steps`** : étapes manuelles groupées
- **`travel_step_segments`** : liaison segments ↔ étapes

### Workflow Export
```
User clicks "Télécharger PDF" 
→ BookletGenerator récupère données via bookletService
→ Affiche BookletPreview + BookletTemplate
→ html2pdf convertit le DOM en PDF
```

---

## 📂 Fichiers de la Brique Export

### 1. **`src/components/BookletGenerator.tsx`**
**Rôle** : Point d'entrée, gère les boutons d'export

**Code clé** :
```typescript
const loadBookletData = async () => {
  const data = await getBookletData(tripId); // Récupère TOUT depuis la DB
  setBookletData(data);
};

const handleGeneratePdf = async () => {
  const element = document.getElementById('booklet-content');
  await html2pdf().set(opt).from(element).save(); // html2pdf.js
};
```

**❌ Ne jamais** : Déclencher des appels IA ici  
**✅ Modifier** : Options PDF, nom fichier, marges

---

### 2. **`src/services/bookletService.ts`**
**Rôle** : Récupération et structuration des données DB

**Fonction principale** :
```typescript
export async function getBookletData(tripId: string): Promise {
  const { data: segments } = await supabase
    .from('travel_segments')
    .select('*')
    .eq('trip_id', tripId)
    .eq('validated', true)
    .order('start_date');

  return {
    tripTitle, startDate, endDate, totalDays,
    segments, timeline, destinations, segmentsByType
  };
}
```

**Retourne** :
- `segments[]` : Tous les segments avec `enriched` JSONB
- `timeline[]` : Groupement par jour
- `segmentsByType{}` : Groupement par type

**✅ Modifier** : Ajout de champs, tri, filtres  
**❌ Ne jamais** : Appeler des edge functions IA

---

### 3. **`src/components/BookletTemplate.tsx`**
**Rôle** : Template HTML du booklet (convertible en PDF)

**Structure** :
```typescript

  {/* En-tête + Cover Images */}

  {/* Itinéraire */}

  {/* Infos Générales */}

  {/* Contacts d'urgence */}

```

**CSS Print** :
```css
@media print {
  .no-print { display: none; }
  .page-break { page-break-before: always; }
}
```

**✅ Modifier** : Styles, sections, ordre d'affichage  
**❌ Ne jamais** : Regénérer du contenu IA

---

### 4. **`src/components/DynamicItinerary.tsx`**
**Rôle** : Affiche les étapes avec contenu IA **pré-généré**

**⚠️ CRITIQUE** :
```typescript
const loadExistingContent = async () => {
  const manualSteps = await getManualSteps(tripId);

  // Extraction du contenu IA depuis segments.enriched
  manualSteps.forEach(step => {
    step.segments.forEach(seg => {
      if (seg.enriched?.aiContent) {
        aiContents[step.stepId] = seg.enriched.aiContent;
      }
    });
  });
};
```

## 🎨 Règles de Style PDF

### Structure Document
1. **Page de garde** : Images + Titre
2. **Corps** : Itinéraire jour par jour
3. **Annexes** : Infos générales + Urgences

### Typographie
```css
h1 { font-size: 28px; color: #1a1a1a; }
h2 { font-size: 22px; color: #2563eb; }
.segment-card { border-left: 4px solid #2563eb; }
```

### Images
- Cover : 800x600px max
- Segments : 300x200px max
- Fallback si erreur : Placeholder gris