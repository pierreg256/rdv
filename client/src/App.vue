<template>
  <div id="app">
    <header class="app-header elevation-2">
      <div class="container header-container">
        <router-link to="/" class="brand">
          <div class="logo-container">
            <fluent-badge appearance="accent" class="logo">SR</fluent-badge>
          </div>
          <h1 class="title">Sonnet Ring</h1>
        </router-link>
        
        <nav class="app-navigation">
          <div class="nav-mobile">
            <fluent-menu>
              <fluent-button appearance="stealth" slot="trigger" aria-label="Menu de navigation">
                <span class="menu-icon"></span>
              </fluent-button>
              <fluent-menu-item>
                <router-link to="/">Accueil</router-link>
              </fluent-menu-item>
              <fluent-menu-item>
                <router-link to="/services">Services</router-link>
              </fluent-menu-item>
              <fluent-menu-item>
                <router-link to="/events">Événements</router-link>
              </fluent-menu-item>
            </fluent-menu>
          </div>
          
          <div class="nav-desktop">
            <fluent-tabs activeid="home" class="nav-tabs">
              <fluent-tab id="home">
                <router-link to="/">Accueil</router-link>
              </fluent-tab>
              <fluent-tab id="services">
                <router-link to="/services">Services</router-link>
              </fluent-tab>
              <fluent-tab id="events">
                <router-link to="/events">Événements</router-link>
              </fluent-tab>
            </fluent-tabs>
          </div>
        </nav>
      </div>
    </header>
    
    <main class="content">
      <div class="container">
        <router-view />
      </div>
    </main>
    
    <footer class="app-footer">
      <div class="container">
        <div class="footer-content">
          <span>Sonnet Ring Dashboard</span>
          <span>© 2025 - Service de découverte pour Cloud</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "App"
});
</script>

<style>
#app {
  font-family: "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--neutral-foreground-rest);
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--neutral-background-secondary);
}

/* Layout containers */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-m);
  box-sizing: border-box;
}

/* Header styling */
.app-header {
  background-color: var(--neutral-background);
  border-bottom: 1px solid #edebe9;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--neutral-foreground-rest);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: var(--space-s);
}

.logo {
  font-weight: 600;
  font-size: 14px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--neutral-foreground-rest);
}

/* Navigation */
.app-navigation {
  display: flex;
}

.nav-tabs {
  height: 100%;
}

.nav-desktop {
  display: flex;
}

.menu-icon {
  display: block;
  width: 20px;
  height: 2px;
  background-color: var(--neutral-foreground-rest);
  position: relative;
}

.menu-icon::before,
.menu-icon::after {
  content: '';
  display: block;
  width: 100%;
  height: 2px;
  background-color: var(--neutral-foreground-rest);
  position: absolute;
}

.menu-icon::before {
  top: -6px;
}

.menu-icon::after {
  bottom: -6px;
}

/* Main content */
.content {
  flex: 1;
  padding: var(--space-l) 0;
}

/* Footer */
.app-footer {
  background-color: var(--neutral-background);
  border-top: 1px solid #edebe9;
  padding: var(--space-m) 0;
  font-size: 12px;
  color: var(--neutral-outline-rest);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Links */
a {
  text-decoration: none;
  color: var(--brand-color);
  transition: color 0.1s ease-out;
}

a:hover {
  color: var(--brand-color-hover);
  text-decoration: none;
}

/* Fluent UI Components styling */
fluent-tab {
  cursor: pointer;
  height: 100%;
  display: flex;
  align-items: center;
}

fluent-tab a {
  display: block;
  padding: var(--space-s) var(--space-m);
  color: var(--neutral-foreground-rest);
  height: 100%;
  box-sizing: border-box;
}

fluent-tab a:hover {
  color: var(--brand-color);
}

fluent-tab[aria-selected="true"] a {
  color: var(--brand-color);
}

/* Responsive design */
@media (max-width: 768px) {
  .nav-desktop {
    display: none;
  }
  
  .header-container {
    height: 56px;
  }
  
  .logo-container {
    width: 28px;
    height: 28px;
  }
  
  .title {
    font-size: 16px;
  }
  
  .content {
    padding: var(--space-m) 0;
  }
  
  .footer-content {
    flex-direction: column;
    gap: var(--space-xs);
    align-items: flex-start;
  }
}

@media (min-width: 769px) {
  .nav-mobile {
    display: none;
  }
}
</style>
