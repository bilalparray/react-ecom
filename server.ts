import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 4200;

async function createServer() {
  const app = express();

  let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;

  if (!isProduction) {
    // Create Vite server in middleware mode
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files
    app.use(
      express.static(path.resolve(__dirname, "dist/client"), {
        index: false,
      })
    );
  }

  // Handle all routes - but skip static assets
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip static assets (let Vite middleware handle them)
    if (
      url.includes(".") &&
      !url.endsWith(".html") &&
      !url.startsWith("/src/") &&
      url !== "/"
    ) {
      return next();
    }

    try {
      let template: string;
      let render: (url: string) => Promise<{
        html: string;
        queryState?: string;
      }>;

      if (!isProduction) {
        // Read index.html from root
        template = fs.readFileSync(
          path.resolve(__dirname, "index.html"),
          "utf-8"
        );
        // Apply Vite HTML transforms
        template = await vite!.transformIndexHtml(url, template);
        // Load the server entry
        const { render: renderApp } = await vite!.ssrLoadModule(
          "/src/entry-server.tsx"
        );
        render = renderApp;
      } else {
        // In production, read from dist
        template = fs.readFileSync(
          path.resolve(__dirname, "dist/client/index.html"),
          "utf-8"
        );
        const { render: renderApp } = await import(
          "./dist/server/entry-server.js"
        );
        render = renderApp;
      }

      // Render the app
      const { html: appHtml, queryState } = await render(url);

      // Inject the rendered app into the template
      const html = template
        .replace(`<!--ssr-outlet-->`, appHtml)
        .replace(
          `<!--ssr-query-state-->`,
          queryState
            ? `<script>window.__REACT_QUERY_STATE__ = ${queryState}</script>`
            : ""
        );

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e: any) {
      console.error("SSR Error:", e);
      if (vite) {
        vite.ssrFixStacktrace(e);
      }
      // Send error response with details in development
      if (!isProduction) {
        res.status(500).set({ "Content-Type": "text/html" }).end(`
          <h1>Internal Server Error</h1>
          <pre>${e.stack || e.message}</pre>
        `);
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();
