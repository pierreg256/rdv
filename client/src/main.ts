import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

// Import correct de FluentUI Web Components avec allComponents pour tous les composants
import {
  allComponents,
  provideFluentDesignSystem,
} from "@fluentui/web-components";

// Enregistrement des composants FluentUI avec la bonne syntaxe
provideFluentDesignSystem().register(allComponents);

const app = createApp(App);
app.use(router);
app.use(store);
app.mount("#app");

console.log("App mounted");
console.log("App version: 1.0.0");
console.log("App description: Vue.js client for Service Discovery API");
console.log("App UI: http://localhost:3000/");
console.log("App API: http://localhost:3000/api/services");
console.log("App UI Dashboard: http://localhost:3000/");
