/**
 * Modèle pour les journaux d'activité des services
 */

// Types d'événements pour les services
export enum ServiceEventType {
  REGISTERED = "registered",
  UPDATED = "updated",
  REFRESHED = "refreshed",
  UNREGISTERED = "unregistered",
  STATUS_CHANGED = "status_changed",
}

// Interface pour un événement de service
export interface ServiceEvent {
  id: string;
  timestamp: number;
  serviceId: string;
  serviceName: string;
  eventType: ServiceEventType;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

// Interface pour les résultats de recherche d'événements
export interface EventQueryResult {
  total: number;
  events: ServiceEvent[];
}
