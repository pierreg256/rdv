<template>
  <div class="services-view">
    <div class="page-header">
      <h1 class="page-title">Services enregistrés</h1>
      <p class="page-description">Gérez les services découverts dans votre réseau</p>
    </div>

    <fluent-card class="content-card elevation-1">
      <div class="card-header">
        <div class="controls">
          <div class="search-group">
            <fluent-text-field 
              appearance="outline" 
              placeholder="Rechercher..." 
              v-model="searchQuery" 
              class="search-input"
            ></fluent-text-field>
          </div>
          
          <div class="filters-group">
            <fluent-select v-model="statusFilter" class="status-select">
              <fluent-option value="">Tous les statuts</fluent-option>
              <fluent-option value="ACTIVE">Actifs</fluent-option>
              <fluent-option value="UNREACHABLE">Injoignables</fluent-option>
            </fluent-select>
            
            <fluent-button appearance="accent" @click="refreshServices" class="refresh-button">
              Rafraîchir
            </fluent-button>
          </div>
        </div>
      </div>
      
      <div class="card-content">
        <div v-if="loading" class="state-container">
          <div class="spinner"></div>
          <span class="state-message">Chargement des services...</span>
        </div>

        <div v-else-if="error" class="state-container error-state">
          <span class="state-icon">!</span>
          <span class="state-message">{{ error }}</span>
        </div>

        <div v-else-if="filteredServices.length === 0" class="state-container info-state">
          <span class="state-icon">i</span>
          <span class="state-message">Aucun service trouvé correspondant à vos critères.</span>
        </div>

        <div v-else class="table-container">
          <table class="services-table">
            <thead>
              <tr>
                <th class="col-name">Nom</th>
                <th class="col-type">Type</th>
                <th class="col-host">Hostname</th>
                <th class="col-ip">IP</th>
                <th class="col-port">Port</th>
                <th class="col-protocol">Protocole</th>
                <th class="col-status">Statut</th>
                <th class="col-updated">Dernière MAJ</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in filteredServices" :key="service.id" class="service-row">
                <td class="col-name">{{ service.name }}</td>
                <td class="col-type">
                  <span class="service-type">{{ service.type }}</span>
                </td>
                <td class="col-host">{{ service.hostname }}</td>
                <td class="col-ip">{{ service.ipAddress || '—' }}</td>
                <td class="col-port">{{ service.port }}</td>
                <td class="col-protocol">{{ service.protocol }}</td>
                <td class="col-status">
                  <div :class="['status-badge', service.status === 'ACTIVE' ? 'status-active' : 'status-unreachable']">
                    {{ service.status }}
                  </div>
                </td>
                <td class="col-updated">
                  <span class="date-value">{{ formatDate(service.lastUpdated) }}</span>
                </td>
                <td class="col-actions">
                  <div class="actions-container">
                    <fluent-button 
                      appearance="lightweight"
                      class="action-button"
                      title="Rafraîchir ce service"
                      @click="refreshService(service.id)"
                      :disabled="refreshingService === service.id"
                    >
                      <span v-if="refreshingService === service.id" class="button-spinner"></span>
                      <span v-else class="refresh-icon"></span>
                    </fluent-button>
                    
                    <fluent-button 
                      appearance="lightweight"
                      class="action-button delete-button"
                      title="Supprimer ce service"
                      @click="unregisterService(service.id)"
                      :disabled="unregisteringService === service.id"
                    >
                      <span v-if="unregisteringService === service.id" class="button-spinner"></span>
                      <span v-else class="delete-icon"></span>
                    </fluent-button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </fluent-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { Service } from "../../../src/models/service.model";

export default defineComponent({
  name: "ServicesView",

  setup() {
    const store = useStore();
    const searchQuery = ref("");
    const statusFilter = ref("");
    const refreshingService = ref<string | null>(null);
    const unregisteringService = ref<string | null>(null);

    onMounted(() => {
      refreshServices();
    });

    const refreshServices = () => {
      store.dispatch("fetchServices");
    };

    const refreshService = async (id: string) => {
      refreshingService.value = id;
      try {
        const response = await fetch(`/api/services/${id}/refresh`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(
            `Erreur lors du rafraîchissement du service: ${response.statusText}`
          );
        }

        await refreshServices();
      } catch (error) {
        console.error("Erreur lors du rafraîchissement du service:", error);
        store.commit(
          "setError",
          error instanceof Error ? error.message : "Erreur inconnue"
        );
      } finally {
        refreshingService.value = null;
      }
    };

    const unregisterService = async (id: string) => {
      if (!confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) {
        return;
      }

      unregisteringService.value = id;
      try {
        const response = await fetch(`/api/services/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la suppression du service: ${response.statusText}`
          );
        }

        await refreshServices();
      } catch (error) {
        console.error("Erreur lors de la suppression du service:", error);
        store.commit(
          "setError",
          error instanceof Error ? error.message : "Erreur inconnue"
        );
      } finally {
        unregisteringService.value = null;
      }
    };

    const services = computed(() => store.getters.getServices);
    const loading = computed(() => store.getters.isLoading);
    const error = computed(() => store.getters.getError);

    const filteredServices = computed(() => {
      return services.value.filter((service: Service) => {
        const matchesSearch = searchQuery.value
          ? service.name
              .toLowerCase()
              .includes(searchQuery.value.toLowerCase()) ||
            service.hostname
              .toLowerCase()
              .includes(searchQuery.value.toLowerCase()) ||
            (service.ipAddress && service.ipAddress.includes(searchQuery.value))
          : true;

        const matchesStatus = statusFilter.value
          ? service.status === statusFilter.value
          : true;

        return matchesSearch && matchesStatus;
      });
    });

    const formatDate = (timestamp: string | number) => {
      return new Date(timestamp).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    };

    return {
      searchQuery,
      statusFilter,
      refreshingService,
      unregisteringService,
      services,
      filteredServices,
      loading,
      error,
      refreshServices,
      refreshService,
      unregisterService,
      formatDate,
    };
  },
});
</script>

<style scoped>
.services-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-l);
}

/* Page header */
.page-header {
  margin-bottom: var(--space-m);
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--neutral-foreground-rest);
  margin: 0 0 var(--space-xs) 0;
  line-height: 1.2;
}

.page-description {
  font-size: 14px;
  margin: 0;
  color: var(--neutral-outline-rest);
}

/* Card styles */
.content-card {
  background-color: var(--neutral-background);
  border-radius: var(--border-radius-medium);
  overflow: hidden;
}

.card-header {
  padding: var(--space-m) var(--space-l);
  border-bottom: 1px solid #edebe9;
}

.card-content {
  min-height: 300px;
}

/* Controls */
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-m);
  align-items: center;
  justify-content: space-between;
}

.search-group {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.filters-group {
  display: flex;
  gap: var(--space-s);
  align-items: center;
}

.status-select {
  width: 150px;
}

.refresh-button {
  white-space: nowrap;
}

/* State containers */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl) var(--space-l);
  gap: var(--space-m);
  text-align: center;
}

.state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: bold;
}

.error-state .state-icon {
  background-color: #fdeded;
  color: var(--error-color);
}

.info-state .state-icon {
  background-color: #f0f6ff;
  color: var(--brand-color);
}

.state-message {
  font-size: 14px;
  color: var(--neutral-foreground-rest);
}

/* Spinner */
.spinner,
.button-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 120, 212, 0.2);
  border-top-color: #0078d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.button-spinner {
  width: 14px;
  height: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Table styles */
.table-container {
  overflow-x: auto;
}

.services-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.services-table th {
  padding: var(--space-s) var(--space-m);
  text-align: left;
  font-weight: 600;
  color: var(--neutral-foreground-rest);
  border-bottom: 1px solid #edebe9;
  background-color: #faf9f8;
  position: sticky;
  top: 0;
  z-index: 1;
}

.services-table td {
  padding: var(--space-s) var(--space-m);
  border-bottom: 1px solid #edebe9;
  vertical-align: middle;
}

.service-row:hover {
  background-color: #f3f2f1;
}

/* Table columns */
.col-name {
  min-width: 120px;
  font-weight: 500;
}

.col-type {
  min-width: 100px;
}

.service-type {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--border-radius-small);
  background-color: #f3f2f1;
  font-size: 12px;
}

.col-host,
.col-ip {
  min-width: 120px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
}

.col-port,
.col-protocol {
  white-space: nowrap;
  text-align: center;
}

.col-status {
  min-width: 100px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.status-active {
  background-color: #dff6dd;
  color: var(--success-color);
}

.status-unreachable {
  background-color: #fdeded;
  color: var(--error-color);
}

.col-updated {
  min-width: 120px;
  white-space: nowrap;
}

.date-value {
  font-size: 13px;
  color: var(--neutral-outline-rest);
}

.col-actions {
  min-width: 100px;
}

.actions-container {
  display: flex;
  gap: var(--space-xxs);
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  border-radius: var(--border-radius-small);
}

.delete-button:hover {
  color: var(--error-color);
}

/* Icons */
.refresh-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='currentColor' d='M14.15 4.65a7 7 0 0 0-12-2L0 4.82V1.5a.5.5 0 0 0-1 0v5a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 0-1H1.7l2.15-2.17a6 6 0 0 1 10.3 1.71.5.5 0 1 0 .98-.21zM.85 11.35a7 7 0 0 0 12 2L15 11.18v3.32a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h2.8l-2.15 2.17a6 6 0 0 1-10.3-1.71.5.5 0 1 0-.98.21z'/%3E%3C/svg%3E");
}

.delete-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='currentColor' d='M8.5 2h3a.5.5 0 0 1 0 1h-.5v10a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V3H3.5a.5.5 0 0 1 0-1h3v-.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V2zM5 3v10h6V3H5zm2.5 2a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .5-.5zm2 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .5-.5z'/%3E%3C/svg%3E");
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-group {
    max-width: none;
  }
  
  .filters-group {
    justify-content: space-between;
  }
  
  .col-protocol,
  .col-updated {
    display: none;
  }
  
  .action-button {
    min-width: 40px;
    height: 40px;
  }
}
</style>
