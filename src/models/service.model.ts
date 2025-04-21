/**
 * Modèles pour l'API de découverte de services
 */

// Type de service
export enum ServiceType {
  HTTP = "http",
  HTTPS = "https",
  FTP = "ftp",
  SSH = "ssh",
  PRINTER = "printer",
  DATABASE = "database",
  CUSTOM = "custom",
  RING_NODE = "ring_node",
}

// Interface pour les métadonnées d'un service
export interface ServiceMetadata {
  [key: string]: string | number | boolean;
}

// Interface pour un service
export interface Service {
  id: string; // Identifiant unique du service
  name: string; // Nom du service
  type: ServiceType; // Type de service
  hostname: string; // Nom d'hôte
  ipAddress?: string; // Adresse IP (optionnelle, peut être déterminée par le serveur)
  port: number; // Port
  path?: string; // Chemin (pour les services web)
  protocol: string; // Protocole (http, https, etc.)
  subtype?: string; // Sous-type du service
  metadata: ServiceMetadata; // Métadonnées supplémentaires du service
  ttl: number; // Durée de vie en secondes
  lastUpdated: number; // Timestamp de la dernière mise à jour
  registered: number; // Timestamp de l'enregistrement initial
  status: ServiceStatus; // Statut du service
}

// Statut d'un service
export enum ServiceStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  UNREACHABLE = "unreachable",
}

// Interface pour la création d'un service
export interface CreateServiceDto {
  name: string;
  type: ServiceType;
  hostname: string;
  ipAddress?: string;
  port: number;
  path?: string;
  protocol: string;
  subtype?: string;
  metadata?: ServiceMetadata;
  ttl?: number;
}

// Interface pour la mise à jour d'un service
export interface UpdateServiceDto {
  name?: string;
  hostname?: string;
  ipAddress?: string;
  port?: number;
  path?: string;
  protocol?: string;
  subtype?: string;
  metadata?: ServiceMetadata;
  ttl?: number;
  status?: ServiceStatus;
}

// Interface pour les résultats de recherche de services
export interface ServiceQueryResult {
  total: number;
  services: Service[];
}

// Interface pour les filtres de recherche de services
export interface ServiceQueryFilters {
  type?: ServiceType;
  name?: string;
  hostname?: string;
  port?: number;
  protocol?: string;
  subtype?: string;
  status?: ServiceStatus;
  metadataKey?: string;
  metadataValue?: string | number | boolean;
}
