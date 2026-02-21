import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from '@hocuspocus/server';
import expressWs from 'express-ws';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup Hocuspocus Server
  const hocuspocus = Server.configure({
    name: 'hocuspocus',
    port: PORT,
    timeout: 30000,
    debounce: 5000,
    maxDebounce: 30000,
    quiet: true,
  });

  // Setup Express-WS to handle upgrades
  const { app: wsApp } = expressWs(app);

  // Handle WebSocket connections for collaboration
  wsApp.ws('/collaboration', (websocket, request) => {
    hocuspocus.handleConnection(websocket, request);
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files (if built)
    // This is just a fallback, usually handled by nginx or similar in real prod
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
