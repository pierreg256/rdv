import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import config from "./config";
import { errorHandler } from "./middlewares/errorHandler";
import serviceRoutes from "./routes/service.routes";
import eventRoutes from "./routes/event.routes";
import ringRoutes from "./routes/ring.routes";
import selfRegisterService from "./services/selfRegister.service";

// Initialisation de l'application Express
const app = express();

// Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "cdn.jsdelivr.net"],
        "style-src": ["'self'", "cdn.jsdelivr.net", "'unsafe-inline'"],
      },
    },
  })
); // Sécurité avec configuration pour les CDN
app.use(cors()); // Gestion des CORS
app.use(morgan("dev")); // Logging
app.use(express.json()); // Parser pour JSON

// Routes API
app.use("/api/services", serviceRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/ring", ringRoutes);

// Route pour healthcheck
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Servir l'application Vue.js
//if (process.env.NODE_ENV === "production") {
// Servir les fichiers statiques de l'application Vue.js compilée
app.use(express.static(path.join(__dirname, "../dist/client")));

// Route catch-all pour SPA - toute route non API renvoie vers l'application Vue
app.get(/^(?!\/api|\/health).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/client/index.html"));
});
// } else {
//   // En développement, afficher un message pour l'API
//   app.get("/", (req, res) => {
//     res.status(200).json({
//       name: "Service Discovery API",
//       version: "1.0.0",
//       description:
//         "API stateless pour la découverte de services, alternative à Bonjour/mDNS pour le cloud",
//       ui: "Pour accéder à l'interface utilisateur, compilez l'application client avec 'npm run build:client'",
//     });
//   });
// }

// Gestion des routes inexistantes (pour l'API uniquement)
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`,
  });
});

// Gestion des erreurs
app.use(errorHandler);

// Démarrage du serveur
const PORT = config.port;
const server = app.listen(PORT, async () => {
  console.log(`Serveur démarré sur le port ${PORT} en mode ${config.nodeEnv}`);
  console.log(`URL API: http://localhost:${PORT}/api/services`);
  console.log(`URL UI Dashboard: http://localhost:${PORT}/`);

  // Démarrage du service d'auto-enregistrement
  try {
    await selfRegisterService.start();
    console.log("Service d'auto-enregistrement démarré");
  } catch (error) {
    console.error(
      "Erreur lors du démarrage du service d'auto-enregistrement:",
      error
    );
  }
});

// Gestion de l'arrêt propre
process.on("SIGINT", async () => {
  console.log("Arrêt du serveur...");

  // Arrêt du service d'auto-enregistrement
  await selfRegisterService.stop();
  console.log("Service d'auto-enregistrement arrêté");

  server.closeAllConnections();
  server.close(() => {
    console.log("Serveur HTTP arrêté");
    process.exit(0);
  });
});

export default app;
