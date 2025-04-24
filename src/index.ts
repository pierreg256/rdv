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

// Configuration CORS améliorée - avec support pour le domaine Azure en production
const corsOptions = {
  origin: [
    "http://localhost:3001",
    "http://localhost:3000",
    "http://4.211.152.236:1",
    "http://4.211.152.236",
    "https://ring-dashboard.franc.oudapp.azure.com", // Domaine Azure de production
    "https://ring-dashboard.francecentral.cloudapp.azure.com", // Domaine Azure alternatif
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  exposedHeaders: ["Content-Disposition"],
};

// Middlewares
app.use(cors(corsOptions)); // Utilisation de la configuration CORS améliorée
app.use(morgan("dev")); // Logging
app.use(express.json()); // Parser pour JSON

// Utiliser helmet avec des options personnalisées pour éviter les erreurs CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "cdn.jsdelivr.net",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://localhost:3001",
          "http://4.211.152.236:1",
          "http://4.211.152.236",
          "https://ring-dashboard.francecentral.cloudapp.azure.com",
        ],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'", "data:"],
      },
    },
    // Désactiver ces en-têtes qui causent des problèmes
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// Middleware pour ajouter les en-têtes manuellement pour tous les domaines
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Autoriser tous les domaines de production et développement
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Désactiver les politiques d'isolation d'origine qui causent les erreurs
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

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
