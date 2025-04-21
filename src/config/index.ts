import dotenv from "dotenv";
import path from "path";

// Charger les variables d'environnement
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  serviceTtl: number;
  healthCheckInterval: number;
  inMemoryCleanupInterval: number;
  azure: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
    resourceGroup: string;
    ringNodeDiscoveryInterval: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  serviceTtl: parseInt(process.env.SERVICE_TTL || "60", 10),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || "30", 10),
  inMemoryCleanupInterval: parseInt(
    process.env.IN_MEMORY_CLEANUP_INTERVAL || "60",
    10
  ),
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || "",
    clientId: process.env.AZURE_CLIENT_ID || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || "",
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || "",
    ringNodeDiscoveryInterval: parseInt(
      process.env.RING_NODE_DISCOVERY_INTERVAL || "300",
      10
    ), // Par défaut, toutes les 5 minutes
  },
};

export default config;
