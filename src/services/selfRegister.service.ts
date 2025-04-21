import { hostname } from "os";
import * as os from "os";
import { networkInterfaces } from "os";
import config from "../config";
import {
  ServiceType,
  CreateServiceDto,
  Service,
  ServiceStatus,
} from "../models/service.model";
import serviceDiscoveryService from "./serviceDiscovery.service";
import { ComputeManagementClient } from "@azure/arm-compute";
import { DefaultAzureCredential } from "@azure/identity";
import { NetworkManagementClient } from "@azure/arm-network";
import { VirtualMachine } from "@azure/arm-compute";
import axios from "axios";

class SelfRegisterService {
  private serviceId: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private azureDiscoveryTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private computeClient: ComputeManagementClient | null = null;
  private networkClient: NetworkManagementClient | null = null;
  private discoveredRingNodes: Set<string> = new Set();

  /**
   * Démarre le processus d'auto-enregistrement et de rafraîchissement
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(
        "Le service d'auto-enregistrement est déjà en cours d'exécution."
      );
      return;
    }

    this.isRunning = true;

    try {
      // Création du service
      await this.registerAsRingNode();

      // Configuration du timer pour le rafraîchissement périodique
      this.timer = setInterval(
        async () => await this.refreshRegistration(),
        config.healthCheckInterval * 1000
      );

      // Initialisation du client Azure si la configuration est présente
      if (this.isAzureConfigValid()) {
        this.initAzureClient();

        // Démarrer la découverte des nœuds RING sur Azure
        await this.discoverRingNodesOnAzure();

        // Configuration du timer pour la découverte périodique
        // Utiliser HEALTH_CHECK_INTERVAL au lieu de ringNodeDiscoveryInterval
        this.azureDiscoveryTimer = setInterval(
          async () => await this.discoverRingNodesOnAzure(),
          config.healthCheckInterval * 1000
        );

        console.log(
          `Découverte des nœuds RING Azure programmée toutes les ${config.healthCheckInterval} secondes`
        );
      } else {
        console.log(
          "La configuration Azure est incomplète, la découverte des nœuds RING via Azure est désactivée"
        );
      }

      console.log(`Service RING_NODE enregistré avec l'ID: ${this.serviceId}`);
      console.log(
        `Rafraîchissement programmé toutes les ${config.healthCheckInterval} secondes`
      );
    } catch (error) {
      this.isRunning = false;
      console.error("Erreur lors de l'auto-enregistrement:", error);
    }
  }

  /**
   * Arrête le processus d'auto-enregistrement et de rafraîchissement
   */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.azureDiscoveryTimer) {
      clearInterval(this.azureDiscoveryTimer);
      this.azureDiscoveryTimer = null;
    }

    if (this.serviceId) {
      try {
        await serviceDiscoveryService.unregisterService(this.serviceId);
        console.log(`Service RING_NODE désenregistré: ${this.serviceId}`);
      } catch (error) {
        console.error("Erreur lors du désenregistrement:", error);
      }
      this.serviceId = null;
    }

    this.isRunning = false;
  }

  /**
   * Enregistre ce service en tant que nœud RING
   */
  private async registerAsRingNode(): Promise<void> {
    const hostName = hostname();
    const PORT = config.port;
    const ipAddress = this.getLocalIpAddress();

    const serviceData: CreateServiceDto = {
      name: `RING_NODE_${hostName}`,
      type: ServiceType.RING_NODE,
      hostname: hostName,
      ipAddress: ipAddress, // Utilisation de ipAddress au lieu de ip
      port: PORT,
      protocol: "http",
      metadata: {
        version: "1.0.0",
        startTime: Date.now(),
      },
      ttl: config.serviceTtl,
    };

    try {
      const registeredService = await serviceDiscoveryService.registerService(
        serviceData
      );
      this.serviceId = registeredService.id;
    } catch (error: any) {
      // Si le service existe déjà (code 409), on récupère l'ID existant
      if (error?.statusCode === 409 && error?.details?.existingServiceId) {
        this.serviceId = error.details.existingServiceId;
        console.log(
          `Service déjà enregistré avec l'ID: ${this.serviceId}, utilisation de l'ID existant.`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Obtient l'adresse IP locale de la machine
   * @returns L'adresse IP non-interne la plus probable
   */
  private getLocalIpAddress(): string {
    const nets = networkInterfaces();
    let ipAddress = "127.0.0.1"; // Valeur par défaut

    // Parcourir toutes les interfaces réseau
    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (!interfaces) continue;

      // Rechercher la première adresse IPv4 non-interne
      for (const net of interfaces) {
        // Ignorer les adresses IPv6 et les adresses de bouclage (loopback)
        if (net.family === "IPv4" && !net.internal) {
          ipAddress = net.address;
          return ipAddress; // Retourner la première adresse IPv4 non-interne trouvée
        }
      }
    }

    console.warn(
      "Aucune adresse IP externe trouvée, utilisation de l'adresse de bouclage"
    );
    return ipAddress;
  }

  /**
   * Vérifie si la configuration Azure est complète
   */
  private isAzureConfigValid(): boolean {
    return !!config.azure.subscriptionId && !!config.azure.resourceGroup;
  }

  /**
   * Initialise le client Azure
   */
  private initAzureClient(): void {
    try {
      const credential = new DefaultAzureCredential();

      this.computeClient = new ComputeManagementClient(
        credential,
        config.azure.subscriptionId
      );

      // Initialize network client for network interface and public IP operations
      this.networkClient = new NetworkManagementClient(
        credential,
        config.azure.subscriptionId
      );

      console.log("Client Azure initialisé avec succès");
    } catch (error) {
      console.error("Erreur lors de l'initialisation du client Azure:", error);
    }
  }

  /**
   * Découvre les nœuds RING sur Azure
   */
  private async discoverRingNodesOnAzure(): Promise<void> {
    if (!this.computeClient || !this.networkClient) {
      console.warn("Le client Azure n'est pas initialisé");
      return;
    }

    try {
      console.log("Démarrage de la découverte des nœuds RING sur Azure...");

      // Récupérer toutes les VMs du groupe de ressources
      const vmsIterator = this.computeClient.virtualMachines.list(
        config.azure.resourceGroup
      );

      // Collect all VMs into an array first
      const allVms: VirtualMachine[] = [];
      for await (const vm of vmsIterator) {
        allVms.push(vm);
      }

      // Filtrer les VMs avec le tag RING_NODE=YES
      const ringNodes = allVms.filter((vm: VirtualMachine) => {
        if (!vm.tags) return false;
        return vm.tags["RING_NODE"] === "YES";
      });

      console.log(`${ringNodes.length} nœuds RING découverts sur Azure`);

      // Pour chaque VM RING, récupérer son adresse IP et l'ajouter à la liste des nœuds découverts
      for (const vm of ringNodes) {
        try {
          // Récupérer l'interface réseau associée à la VM
          const networkInterfaceId =
            vm.networkProfile?.networkInterfaces?.[0]?.id;
          if (!networkInterfaceId) {
            console.warn(`Interface réseau non trouvée pour la VM ${vm.name}`);
            continue;
          }

          // Extraire le nom de l'interface réseau depuis son ID
          const nicNameMatch = networkInterfaceId.match(
            /\/networkInterfaces\/([^/]+)$/
          );
          if (!nicNameMatch) {
            console.warn(
              `Impossible d'extraire le nom de l'interface réseau pour la VM ${vm.name}`
            );
            continue;
          }

          const nicName = nicNameMatch[1];

          // Récupérer les détails de l'interface réseau
          const nic = await this.networkClient.networkInterfaces.get(
            config.azure.resourceGroup,
            nicName
          );

          // Récupérer l'adresse IP publique
          const publicIpId = nic.ipConfigurations?.[0]?.publicIPAddress?.id;
          let ipAddress = nic.ipConfigurations?.[0]?.privateIPAddress;

          if (publicIpId) {
            // Extraire le nom de l'adresse IP publique depuis son ID
            const publicIpNameMatch = publicIpId.match(
              /\/publicIPAddresses\/([^/]+)$/
            );
            if (publicIpNameMatch) {
              const publicIpName = publicIpNameMatch[1];

              // Récupérer les détails de l'adresse IP publique
              const publicIp = await this.networkClient.publicIPAddresses.get(
                config.azure.resourceGroup,
                publicIpName
              );

              // Utiliser l'adresse IP publique si elle existe
              if (publicIp.ipAddress) {
                ipAddress = publicIp.ipAddress;
              }
            }
          }

          if (!ipAddress) {
            console.warn(`Adresse IP non trouvée pour la VM ${vm.name}`);
            continue;
          }

          // Construire l'URL du nœud RING
          const ringNodeUrl = `http://${ipAddress}:${config.port}`;

          // Ajouter l'URL du nœud RING à la liste des nœuds découverts
          this.discoveredRingNodes.add(ringNodeUrl);

          // S'enregistrer auprès du nœud RING découvert
          await this.registerWithRingNode(ringNodeUrl);
        } catch (error) {
          console.error(
            `Erreur lors de la récupération de l'adresse IP de la VM ${vm.name}:`,
            error
          );
        }
      }

      console.log(
        `Nombre total de nœuds RING connus: ${this.discoveredRingNodes.size}`
      );
    } catch (error) {
      console.error(
        "Erreur lors de la découverte des nœuds RING sur Azure:",
        error
      );
    }
  }

  /**
   * S'enregistre auprès d'un nœud RING distant
   * @param ringNodeUrl L'URL du nœud RING
   */
  private async registerWithRingNode(ringNodeUrl: string): Promise<void> {
    // Ignorer les tentatives d'enregistrement auprès de soi-même
    const selfUrl = `http://${this.getLocalIpAddress()}:${config.port}`;
    if (ringNodeUrl === selfUrl) {
      console.log(`Ignoré l'enregistrement auprès de soi-même: ${ringNodeUrl}`);
      return;
    }

    try {
      // Obtenir les informations du service local
      if (!this.serviceId) {
        console.warn(
          "L'ID du service local n'est pas défini, impossible de s'enregistrer auprès du nœud RING"
        );
        return;
      }

      const localService = await serviceDiscoveryService.getServiceById(
        this.serviceId
      );
      if (!localService) {
        console.warn(
          "Le service local n'a pas été trouvé, impossible de s'enregistrer auprès du nœud RING"
        );
        return;
      }

      // Créer les données du service à enregistrer
      const serviceData: CreateServiceDto = {
        name: localService.name,
        type: localService.type,
        hostname: localService.hostname,
        ipAddress: localService.ipAddress,
        port: localService.port,
        protocol: localService.protocol,
        metadata: localService.metadata,
        ttl: config.serviceTtl,
      };

      // Envoyer la requête d'enregistrement au nœud RING distant
      const response = await axios.post(
        `${ringNodeUrl}/api/services`,
        serviceData,
        {
          timeout: 5000, // Timeout de 5 secondes
        }
      );

      console.log(
        `Service enregistré avec succès auprès du nœud RING à ${ringNodeUrl}`
      );
      return;
    } catch (error: any) {
      // Si le service existe déjà (code 409), c'est considéré comme un succès
      if (error?.response?.status === 409) {
        console.log(
          `Service déjà enregistré auprès du nœud RING à ${ringNodeUrl}`
        );
        return;
      }

      console.error(
        `Erreur lors de l'enregistrement auprès du nœud RING à ${ringNodeUrl}:`,
        error.message || error
      );
    }
  }

  /**
   * Rafraîchit l'enregistrement du service
   */
  private async refreshRegistration(): Promise<void> {
    try {
      if (!this.serviceId) {
        console.warn(
          "L'ID du service n'est pas défini, impossible de rafraîchir l'enregistrement"
        );
        return;
      }

      // Rafraîchir l'enregistrement local
      await serviceDiscoveryService.updateService(this.serviceId, {
        status: ServiceStatus.ACTIVE,
      });

      // Rafraîchir l'enregistrement auprès des nœuds RING découverts
      for (const ringNodeUrl of this.discoveredRingNodes) {
        await this.registerWithRingNode(ringNodeUrl);
      }

      console.log(`Enregistrement rafraîchi pour le service ${this.serviceId}`);
    } catch (error) {
      console.error(
        "Erreur lors du rafraîchissement de l'enregistrement:",
        error
      );
    }
  }
}

// Export d'une instance singleton
export default new SelfRegisterService();
