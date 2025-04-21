# Service Discovery API

Une API REST stateless écrite en TypeScript qui fournit des fonctionnalités similaires au protocole de découverte "Bonjour" d'Apple, mais adaptée pour fonctionner dans le cloud sans utiliser mDNS (multicast DNS).

## Description

Ce projet implémente un service de découverte de services pour les environnements cloud où le multicast n'est pas disponible. Il utilise un stockage en mémoire pour les informations de service et expose une API REST pour l'enregistrement, la découverte et la gestion des services. Chaque instance est complètement stateless, ce qui signifie qu'elle peut être facilement répliquée et déployée dans des environnements cloud.

## Fonctionnalités

- Enregistrement et désenregistrement de services
- Mise à jour des informations de service
- "Heartbeat" pour indiquer qu'un service est toujours actif
- Recherche de services avec filtrage sur différents critères
- Vérification automatique de l'état des services
- Suivi des événements des services (journalisation des activités)
- Statistiques sur les services enregistrés
- Nettoyage automatique des services inactifs
- Architecture stateless - chaque instance ne conserve l'état qu'en mémoire

## Prérequis

- Node.js (v14 ou supérieur)
- npm ou yarn

## Installation

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd rdv

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Modifier les variables dans .env selon votre environnement

# Compiler le TypeScript
npm run build

# Démarrer l'application
npm start
```

Pour le développement :

```bash
npm run dev
```

## Configuration

Les variables d'environnement suivantes sont utilisées :

| Variable                   | Description                                             | Valeur par défaut |
| -------------------------- | ------------------------------------------------------- | ----------------- |
| PORT                       | Port sur lequel l'API écoute                            | 3000              |
| NODE_ENV                   | Environnement (development, production)                 | development       |
| SERVICE_TTL                | Durée de vie des services en secondes                   | 60                |
| HEALTH_CHECK_INTERVAL      | Intervalle de vérification de santé en secondes         | 30                |
| IN_MEMORY_CLEANUP_INTERVAL | Intervalle de nettoyage du stockage mémoire en secondes | 60                |

## API REST

### Services Endpoints

| Méthode | URL                          | Description                               |
| ------- | ---------------------------- | ----------------------------------------- |
| POST    | /api/services/register       | Enregistre un nouveau service             |
| PUT     | /api/services/:id            | Met à jour un service existant            |
| POST    | /api/services/:id/refresh    | Rafraîchit un service (heartbeat)         |
| DELETE  | /api/services/:id            | Supprime un service                       |
| GET     | /api/services/:id            | Récupère les détails d'un service         |
| GET     | /api/services                | Recherche des services avec filtres       |
| GET     | /api/services/:id/health     | Vérifie la santé d'un service             |
| GET     | /api/services/stats/overview | Obtient des statistiques sur les services |
| GET     | /api/services/types/:type    | Récupère les services par type            |

### Événements Endpoints

| Méthode | URL                            | Description                          |
| ------- | ------------------------------ | ------------------------------------ |
| GET     | /api/events                    | Récupère tous les événements         |
| GET     | /api/events/:id                | Récupère un événement par son ID     |
| GET     | /api/events/service/:serviceId | Récupère les événements d'un service |
| GET     | /api/events/type/:type         | Récupère les événements par type     |
| DELETE  | /api/events/prune              | Supprime les événements anciens      |

### Exemples de requêtes

#### Enregistrer un service

```http
POST /api/services/register
Content-Type: application/json

{
  "name": "MonAPI",
  "type": "http",
  "hostname": "api.exemple.com",
  "port": 8080,
  "protocol": "http",
  "metadata": {
    "version": "1.0.0",
    "environment": "production",
    "region": "eu-west-1"
  }
}
```

#### Mettre à jour un service

```http
PUT /api/services/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "port": 8081,
  "metadata": {
    "version": "1.0.1",
    "environment": "production",
    "region": "eu-west-1"
  }
}
```

#### Rafraîchir un service

```http
POST /api/services/123e4567-e89b-12d3-a456-426614174000/refresh
```

#### Rechercher des services

```http
GET /api/services?type=http&metadataKey=environment&metadataValue=production
```

#### Obtenir des statistiques sur les services

```http
GET /api/services/stats/overview
```

#### Récupérer les événements d'un service

```http
GET /api/events/service/123e4567-e89b-12d3-a456-426614174000
```

#### Supprimer les événements anciens

```http
DELETE /api/events/prune?olderThan=30
```

## Types d'événements

Notre API enregistre automatiquement les événements suivants pour chaque service :

| Type           | Description                               |
| -------------- | ----------------------------------------- |
| registered     | Enregistrement d'un nouveau service       |
| updated        | Mise à jour d'un service existant         |
| refreshed      | Rafraîchissement d'un service (heartbeat) |
| unregistered   | Suppression d'un service                  |
| status_changed | Changement de statut d'un service         |

## Architecture Stateless

Cette API est conçue pour être complètement stateless, avec les caractéristiques suivantes :

- Tout l'état est stocké en mémoire, ce qui signifie que les données sont perdues en cas de redémarrage
- Chaque instance de l'API maintient son propre état indépendant
- Idéale pour les environnements où les services s'enregistrent régulièrement (heartbeats)
- Adapté pour les déploiements en cluster avec équilibrage de charge
- Sans dépendance à une base de données externe

### Considérations pour les déploiements multi-instances

Si vous déployez plusieurs instances de cette API :

1. Les services clients devraient s'enregistrer auprès de toutes les instances ou utiliser un équilibreur de charge
2. Les services doivent envoyer des heartbeats régulièrement pour maintenir leur état
3. Le système peut tolérer un certain degré de volatilité des données

## Structure du projet

```
.
├── src/
│   ├── config/               # Configuration de l'application
│   ├── controllers/          # Contrôleurs pour gérer les requêtes HTTP
│   ├── middlewares/          # Middlewares Express
│   ├── models/               # Modèles de données
│   ├── routes/               # Définition des routes
│   ├── services/
│   │   ├── inMemoryStore.service.ts   # Service de stockage en mémoire
│   │   ├── serviceDiscovery.service.ts # Service de découverte
│   │   └── serviceEvent.service.ts     # Service d'événements
│   ├── utils/                # Fonctions utilitaires
│   └── index.ts              # Point d'entrée de l'application
├── .env                      # Variables d'environnement
├── package.json              # Dépendances et scripts
└── tsconfig.json             # Configuration TypeScript
```

## Comparaison avec Bonjour/mDNS

| Fonctionnalité                    | Bonjour/mDNS            | Cette API                  |
| --------------------------------- | ----------------------- | -------------------------- |
| Découverte automatique            | Oui (multicast)         | Non (requêtes HTTP)        |
| Enregistrement de service         | Automatique             | API REST                   |
| Résolution de nom                 | Locale                  | API REST                   |
| Fonctionne en environnement cloud | Non                     | Oui                        |
| Gestion de l'état des services    | Automatique             | Heartbeat + nettoyage      |
| Filtrage des services             | Limité                  | Avancé (métadonnées)       |
| Journalisation des activités      | Non                     | Oui (événements)           |
| Statistiques                      | Non                     | Oui                        |
| Persistance des données           | N/A                     | En mémoire (transitoire)   |
| Réplication des données           | Automatique (multicast) | Manuelle (multi-instances) |

## Clients

Pour interagir avec cette API, vous pouvez créer un client dans n'importe quel langage qui supporte les requêtes HTTP. Exemple en JavaScript :

```javascript
// Client pour enregistrer un service
async function registerService(serviceData) {
  const response = await fetch("http://localhost:3000/api/services/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serviceData),
  });
  return response.json();
}

// Client pour rechercher des services
async function findServices(filters = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    queryParams.append(key, value);
  });

  const response = await fetch(
    `http://localhost:3000/api/services?${queryParams}`
  );
  return response.json();
}

// Client pour rafraîchir un service (heartbeat)
async function refreshService(id) {
  const response = await fetch(
    `http://localhost:3000/api/services/${id}/refresh`,
    {
      method: "POST",
    }
  );
  return response.json();
}

// Client pour obtenir l'historique des événements d'un service
async function getServiceEvents(serviceId) {
  const response = await fetch(
    `http://localhost:3000/api/events/service/${serviceId}`
  );
  return response.json();
}
```

## Licence

MIT
