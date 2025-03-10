import { UserAgent } from "@std/http/user-agent";
import { common, dirname, extname, join, resolve } from "@std/path";
import { buildFile } from "./build.ts";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "./conventions.ts";
import { generateCSS } from "./css.ts";
import { App, type Handle } from "./server/app.ts";
import { Router } from "./server/router.ts";
import { dev } from "$env";

const handle: Handle = async ({ context, resolve }) => {
  // Avoid mime type sniffing
  context.headers.set("X-Content-Type-Options", "nosniff");

  if (!dev()) {
    const ua = new UserAgent(context.request.headers.get("user-agent") ?? "");
    console.log("ua:", ua);
  }

  return await resolve(context);
};

type StartOptions = {
  router?: {
    /**
     * An object mapping matcher names to their corresponding regexp definition.
     *
     * Matchers allow to filter dynamic routes like `[id=number]` with a "number" matcher.
     * For example:
     *
     * ```ts
     * matchers: {
     *  number: /^\d+$/
     * }
     * ```
     */
    matchers?: Record<string, RegExp>;
    /**
     * Specifies the location of the node_modules folder relative to the deno.json file to serve local dependencies from in dev mode, like `.` or `..` etc.
     *
     * @default `.`
     */
    nodeModulesRoot?: string;
  };
};

export const start = async (options?: StartOptions): Promise<void> => {
  const hostname = "127.0.0.1";
  const port = 1235;

  const router = new Router({
    routesFolder,
    defaultHandler: () => {
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    },
    matchers: options?.router?.matchers,
  });

  router.serveStatic({ pathname: `/${routesFolder}/*` }, {
    fsRoot: buildFolder,
  });
  router.serveStatic({ pathname: `/${elementsFolder}/*` }, {
    fsRoot: buildFolder,
  });
  router.serveStatic({ pathname: `/${libFolder}/*` }, {
    fsRoot: buildFolder,
  });
  router.serveStatic({ pathname: `/${staticFolder}/*` });

  if (dev()) {
    router.serveStatic({ pathname: `/node_modules/*` }, {
      fsRoot: join(options?.router?.nodeModulesRoot ?? "."),
    });
  }

  await router.generateFileBasedRoutes();

  const app = new App(router, handle);
  const clients = new Set<WebSocket>();

  const wsHandler = (request: Request) => {
    const { socket, response } = Deno.upgradeWebSocket(request);
    socket.onopen = () => {
      console.log("WebSocket Client connected");
      clients.add(socket);
    };
    socket.onclose = () => {
      console.log("WebSocket Client disconnected");
      clients.delete(socket);
    };
    socket.onmessage = (e) => {
      console.log("WebSocket message", e);
    };
    socket.onerror = (e) => {
      console.log("WebSocket error", e);
    };
    return response;
  };

  const server = Deno.serve({
    port,
    hostname,
    onListen: () => {
      console.log(`%cListening at ${hostname}:${port}`, "color: green");
    },
  }, (request, info) => {
    console.log("Request", request.method, request.url);
    if (dev() && request.headers.get("upgrade") === "websocket") {
      return wsHandler(request);
    }
    return app.handleRequest(request, info);
  });

  let appWatcher: Deno.FsWatcher | undefined;

  const gracefulShutdown = () => {
    console.log("\nShutting down gracefully...");

    server.shutdown().then(() => {
      appWatcher?.close();
      console.log("Server closed");
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1000, "Normal WebSocket closure");
        }
      }
      clients.clear();
      Deno.exit();
    });
  };

  Deno.addSignalListener("SIGINT", gracefulShutdown);
  Deno.addSignalListener("SIGTERM", gracefulShutdown);

  /**
   * Watcher
   */
  if (dev()) {
    const routesPath = resolve(routesFolder);

    appWatcher = Deno.watchFs(Deno.cwd(), { recursive: true });

    /**
     * Simple throttling mechanism to prevent duplicated File System events
     */
    class Throttle<T> extends Set<T> {
      timeout: number;
      timers = new Set<number>();

      constructor(timeout: number) {
        super();
        this.timeout = timeout;
      }

      override add(value: T): this {
        super.add(value);

        const id = setTimeout(() => {
          super.delete(value);
        }, this.timeout);

        this.timers.add(id);
        return this;
      }

      override clear(): void {
        super.clear();
        for (const id of this.timers) {
          clearTimeout(id);
        }
      }
    }

    /**
     * Throttle precision in ms
     */
    const timeout = 200;
    const throttle = new Throttle<string>(timeout);
    const removeEvents = new Map<string, number>();

    for await (const event of appWatcher) {
      const time = Math.floor(Date.now() / timeout);
      console.log(`FS Event`, event.kind, time);

      // Update generated CSS variables
      if (
        event.kind === "modify" &&
        event.paths.every((p) => [".html", ".css"].includes(extname(p)))
      ) {
        if (!throttle.has(`css`)) {
          console.log("Generate css variables");
          await generateCSS();
          throttle.add(`css`);
        }
      }

      for (const path of event.paths) {
        const dest = join(buildFolder, path);

        if (extname(path)) {
          // Build files
          if (
            ["create", "modify", "rename"].includes(event.kind) &&
            !throttle.has(`file:${event.kind}:${path}`)
          ) {
            console.log("building file", path);
            await buildFile(path, dest);
          } else if (event.kind === "remove") {
            if (dest.endsWith(".ts")) {
              Deno.removeSync(dest.replace(/\.ts$/, ".js"));
            } else {
              Deno.removeSync(dest);
            }
            console.log("removed a file", dest);
          }
          throttle.add(`file:${event.kind}:${path}`);
        } else {
          // Update folder structure
          const key = `folder:${event.kind}:${path}`;
          if (!throttle.has(key)) {
            if (event.kind === "create") {
              Deno.mkdirSync(dest);
              console.log("created a folder", path);
            } else if (event.kind === "rename") {
              const matchingSourcePath = removeEvents.entries().find(
                ([removedPath, t]) => {
                  // Heuristic to find the correlated renamed source
                  return t === time && dirname(path) === dirname(removedPath);
                },
              )?.[0];

              if (matchingSourcePath) {
                const matchingSourceDest = join(
                  buildFolder,
                  matchingSourcePath,
                );
                Deno.renameSync(matchingSourceDest, dest);
                console.log(
                  `renamed folder: ${matchingSourceDest}\n\tto: ${dest}`,
                );
              } else {
                console.log("renamed detected but source not found", path);
              }
            } else if (event.kind === "remove") {
              removeEvents.set(path, time);

              // Postpone deletion in case it's a rename
              setTimeout(() => {
                removeEvents.delete(path);
                try {
                  Deno.removeSync(dest, { recursive: true });
                  console.log("removed a folder", path);
                } catch (error) {
                  if (!(error instanceof Deno.errors.NotFound)) {
                    throw error;
                  }
                }
              }, timeout);
            }
            throttle.add(key);

            if (!throttle.has("route")) {
              // Update routes
              if (
                event.paths.some((p) => common([routesPath, p]) === routesPath)
              ) {
                await router.generateFileBasedRoutes();
              }
              throttle.add("route");
            }
          }
        }
      }

      // Hot-reloading
      // Reload if there was an update to an html, css, js or ts file
      if (
        !throttle.has(`reload`) &&
        event.kind === "modify" &&
        event.paths.some((p) =>
          [".html", ".css", ".js", ".ts"].includes(extname(p))
        )
      ) {
        console.log("Hot-Reloading...");
        for (const client of clients) {
          client.send("reload");
        }
        throttle.add(`reload`);
      }
    }
  }
};
