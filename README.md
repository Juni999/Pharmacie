# GardePharm MG

GardePharm MG est une interface web légère pour rechercher des pharmacies de garde à Antananarivo et consulter rapidement la disponibilité de médicaments courants.

> Projet créé par **Lauren Juni**.

## Aperçu

- Recherche instantanée par médicament ou quartier.
- Cartes de pharmacies avec statut, adresse, téléphone et niveaux de stock.
- Carte interactive Leaflet centrée sur Antananarivo.
- Marqueurs personnalisés et popups détaillées.
- Bouton d’appel direct compatible mobile (`tel:`).
- Navigation fluide vers une pharmacie depuis sa carte.
- Interface responsive pour ordinateur, tablette et mobile.
- État vide prévu lorsqu’aucun résultat ne correspond à la recherche.

## Structure

```text
.
├── index.html
├── style.css
├── app.js
├── README.md
└── node_modules/
    └── leaflet/
```

Leaflet est chargé localement depuis `node_modules/leaflet`. Aucun CDN JavaScript ou CSS externe n’est nécessaire pour l’application.

## Lancement local

### Option rapide

Ouvrir `index.html` directement dans un navigateur.

### Option recommandée

Depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir [http://localhost:8000](http://localhost:8000).

Le serveur local évite les restrictions de certains navigateurs concernant les fichiers ouverts avec `file://`.

## Données de démonstration

Les pharmacies et les stocks sont actuellement définis dans `app.js` dans le tableau `pharmacies`. Pour ajouter une pharmacie, reprendre ce format :

```js
{
  id: 10,
  name: 'Pharmacie exemple',
  district: 'Quartier',
  address: 'Adresse complète',
  phone: '+261 34 00 000 00',
  status: 'Ouvert',
  coords: [-18.8792, 47.5079],
  meds: [
    ['Paracétamol', 'stock'],
    ['Amoxicilline', 'limited'],
    ['Spasfon', 'out']
  ]
}
```

États de stock disponibles :

| Valeur | Affichage |
| --- | --- |
| `stock` | En stock |
| `limited` | Stock limité |
| `out` | Rupture |

## Carte et confidentialité des données

Leaflet est local, mais les fonds cartographiques sont fournis par les tuiles OpenStreetMap via le réseau. Une connexion internet est donc nécessaire pour afficher le fond de carte. Les données de pharmacies affichées sont fictives et servent uniquement à la démonstration.

Avant une mise en production, il faudra connecter une source fiable et régulièrement mise à jour, vérifier les numéros de téléphone et afficher une date de dernière synchronisation des stocks.

## Vérifications

La syntaxe JavaScript peut être vérifiée avec :

```bash
node --check app.js
```

## Évolutions possibles

- Géolocalisation de l’utilisateur avec demande de permission explicite.
- Tri par distance ou par pharmacie de garde.
- Filtres dédiés « Ouvert », « De garde » et « En stock ».
- API sécurisée pour les stocks réels.
- Back-office pour les pharmacies partenaires.
- Mode hors-ligne avec cache des données essentielles.

