<template>
  <div class="home-view">
    <!-- Barre de navigation secondaire -->
    <div class="secondary-navbar bg-light border-bottom shadow-sm mb-4">
      <div class="container d-flex flex-column flex-md-row align-items-center py-3">
        <h4 class="mb-3 mb-md-0 me-md-auto">Tableau de bord Ring</h4>
        <nav class="nav nav-pills">
          <a class="nav-link active" href="#resumeServices" aria-current="page">Résumé</a>
          <a class="nav-link" href="#servicesSection">Services</a>
          <a class="nav-link" href="#eventsSection">Événements</a>
          <a class="nav-link" href="#nodesSection">Nœuds</a>
          <div class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              Actions
            </a>
            <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
              <li><a class="dropdown-item" @click="refreshData">Rafraîchir les données</a></li>
              <li><a class="dropdown-item" @click="discoverNodes">Découvrir les nœuds</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="/api/services" target="_blank">API Services</a></li>
              <li><a class="dropdown-item" href="/api/events" target="_blank">API Événements</a></li>
            </ul>
          </div>
        </nav>
      </div>
    </div> 

    <div id="resumeServices" class="jumbotron bg-light p-5 rounded">
      <h1>Tableau de bord du service Ring</h1>
      <p class="lead">
        Ce tableau de bord vous permet de surveiller les services découverts par
        le service Ring.
      </p>
      <hr class="my-4" />
      <p>
        Utilisez les différentes sections pour voir les services actifs, les
        événements récents et gérer vos nœuds Ring.
      </p>
      <div class="d-flex gap-2">
        <router-link to="/services" class="btn btn-primary">
          Voir les services
        </router-link>
        <router-link to="/events" class="btn btn-secondary">
          Voir les événements
        </router-link>
      </div>
    </div>

    <div class="row mt-5">
      <div id="servicesSection" class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h3>Résumé des services</h3>
          </div>
          <div class="card-body">
            <div v-if="loading" class="d-flex justify-content-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
              {{ error }}
            </div>
            <div v-else>
              <p><strong>Total des services:</strong> {{ services.length }}</p>
              <p><strong>Services actifs:</strong> {{ activeServicesCount }}</p>
              <p>
                <strong>Services injoignables:</strong>
                {{ unreachableServicesCount }}
              </p>
              <router-link
                to="/services"
                class="btn btn-sm btn-outline-primary mt-2"
              >
                Voir tous les services
              </router-link>
            </div>
          </div>
        </div>
      </div>
      
      <div id="eventsSection" class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h3>Événements récents</h3>
          </div>
          <div class="card-body">
            <div v-if="loading" class="d-flex justify-content-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
              {{ error }}
            </div>
            <div v-else>
              <p v-if="events.length === 0">Aucun événement récent.</p>
              <ul v-else class="list-group">
                <li
                  v-for="event in recentEvents"
                  :key="event.id"
                  class="list-group-item"
                >
                  <span class="badge text-bg-primary me-2">{{
                    event.type
                  }}</span>
                  {{ event.serviceName }} - {{ formatDate(event.timestamp) }}
                </li>
              </ul>
              <router-link
                to="/events"
                class="btn btn-sm btn-outline-primary mt-2"
              >
                Voir tous les événements
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Nouvelle section pour les nœuds Ring -->
    <div id="nodesSection" class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h3>Nœuds Ring</h3>
            <button @click="discoverNodes" class="btn btn-sm btn-primary">
              <i class="bi bi-search me-1"></i> Découvrir les nœuds
            </button>
          </div>
          <div class="card-body">
            <p class="card-text">
              Cette section affiche les nœuds Ring découverts dans votre réseau et dans Azure.
            </p>
            <div v-if="loading" class="d-flex justify-content-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
            </div>
            <div v-else>
              <p><strong>Nombre de nœuds découverts:</strong> {{ ringNodesCount }}</p>
              <router-link to="/services?type=RING_NODE" class="btn btn-sm btn-outline-primary">
                Voir tous les nœuds
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, ref } from "vue";
import { useStore } from "vuex";
import { ServiceStatus, ServiceType } from "../../../src/models/service.model";

export default defineComponent({
  name: "HomeView",
  setup() {
    const store = useStore();
    const isDiscovering = ref(false);

    onMounted(() => {
      refreshData();
      
      // Charger Bootstrap JS pour les dropdowns
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js";
      document.body.appendChild(script);
    });

    const refreshData = () => {
      store.dispatch("fetchServices");
      store.dispatch("fetchEvents");
    };

    const discoverNodes = async () => {
      if (isDiscovering.value) return;
      
      isDiscovering.value = true;
      try {
        await fetch('/api/ring/discover', { method: 'POST' });
        setTimeout(() => {
          refreshData();
          isDiscovering.value = false;
        }, 2000);
      } catch (error) {
        console.error("Erreur lors de la découverte des nœuds:", error);
        isDiscovering.value = false;
      }
    };

    const services = computed(() => store.getters.getServices);
    const events = computed(() => store.getters.getEvents);
    const loading = computed(() => store.getters.isLoading);
    const error = computed(() => store.getters.getError);

    const activeServicesCount = computed(() =>
      services.value.filter(service => service.status === ServiceStatus.ACTIVE).length
    );

    const unreachableServicesCount = computed(() =>
      services.value.filter(service => service.status === ServiceStatus.UNREACHABLE).length
    );
    
    const ringNodesCount = computed(() =>
      services.value.filter(service => service.type === ServiceType.RING_NODE).length
    );

    const recentEvents = computed(() =>
      [...events.value]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 5)
    );

    const formatDate = (timestamp: string | number) => {
      return new Date(timestamp).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return {
      services,
      events,
      loading,
      error,
      activeServicesCount,
      unreachableServicesCount,
      ringNodesCount,
      recentEvents,
      formatDate,
      refreshData,
      discoverNodes,
      isDiscovering
    };
  },
});
</script>

<style scoped>
.secondary-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-pills .nav-link {
  border-radius: 0.25rem;
  margin: 0 0.2rem;
}

.nav-pills .nav-link.active {
  background-color: #0d6efd;
}

#servicesSection, #eventsSection, #nodesSection {
  scroll-margin-top: 80px;
}

@media (max-width: 768px) {
  .secondary-navbar .container {
    padding: 0.5rem;
  }
  
  .nav-pills {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .nav-pills .nav-link {
    margin: 0.2rem;
  }
}
</style>
