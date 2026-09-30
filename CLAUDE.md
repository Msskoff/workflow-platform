# Contexte projet
Monorepo npm `workflow-platform` : éditeur de workflows exécutables type n8n (Next.js + React Flow en front, Nest.js en back), en phase MVP.
Usage : outil INTERNE d'une entreprise d'agriculture de précision. L'équipe construit des pipelines de traitement de parcelle en glisser-déposer. Le fermier n'accède jamais à l'éditeur, il a un espace client séparé en lecture seule.

# Flux métier
Collecte (GPS, formulaire terrain, image satellite Sentinel-2) → Traitement et analyse → Décision (règles métier explicites, pas de ML) → Restitution (carte, décisions expliquées, rapport PDF, suivi de saison).

# Références produit
Inspirations fonctionnelles : Agworld (cycle plan → recommandation → application), ESA SNAP (graphes de nœuds exécutables par lots), Sentinel Hub (scripts de traitement versionnés), EOSDA (zonage par productivité multi-dates), Cropin (agents terrain mobiles, restitution par SMS).
Cible : exploitations d'Afrique de l'Ouest, connexion souvent faible, fermiers parfois peu à l'aise avec le numérique.

# Contraintes de code
- Fichiers COMPLETS et corrigés, pas de snippets partiels.
- Composants et modules réutilisables (un nœud = un module avec interface commune, un composant UI = un fichier).
- Paramètres NOMMÉS partout (objets de paramètres, pas d'arguments positionnels), fonctions et composants inclus.
- TypeScript strict, types partagés front/back dans un package du monorepo.
- Pas de dépendance lourde sans justification.
- Pas d'authentification complexe ni de multi-utilisateur avancé.

# Hors périmètre
Drone, ML, hors-ligne avancé, facturation, marketplace de nœuds, planification automatique.

# Méthode
Une étape à la fois. À la fin de chaque étape : liste des fichiers créés ou modifiés + commande pour tester.
