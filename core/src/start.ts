import { UserAgent } from "@std/http/user-agent";
import { common, extname, join, relative, resolve } from "@std/path";
import { buildFile } from "./build.ts";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
  ts_extension_regex,
} from "./constants.ts";
import { App, type Handle } from "./server/app.ts";
import { Router } from "./server/router.ts";
import { dev } from "$env";
import { setTimeoutWithAbort } from "./utils.ts";

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

  const handleWebSocket = (socket: WebSocket) => {
    socket.addEventListener("open", () => {
      console.log("WebSocket Client connected");
      clients.add(socket);
    });
    socket.addEventListener("close", () => {
      console.log("WebSocket Client disconnected");
      clients.delete(socket);
    });
    socket.addEventListener("message", (e) => {
      console.log("WebSocket message", e);
    });
    socket.addEventListener("error", (e) => {
      console.log("WebSocket error", e);
    });
  };

  const server = Deno.serve({
    port,
    hostname,
    onListen: () => {
      console.log(`%cListening at ${hostname}:${port}`, "color: green");
    },
  }, (request, info) => {
    console.log("Request", request.method, request.url);
    if (!dev() && request.headers.get("upgrade")) {
      // Not implemented: we don't support upgrades in production
      return new Response(null, { status: 501 });
    }
    if (dev() && request.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(request);
      handleWebSocket(socket);
      return response;
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
        client.close();
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
    console.log("HRM server watching...");
    const routesPath = resolve(routesFolder);
    const buildPath = resolve(buildFolder);

    appWatcher = Deno.watchFs([
      elementsFolder,
      routesFolder,
      libFolder,
      staticFolder,
    ], { recursive: true });

    /**
     * Simple throttling mechanism to prevent duplicated File System events
     */
    class Throttle<T> extends Set<T> {
      #timeout: number;
      #timers = new Set<number>();

      /**
       * @param {number} timeout Throttle precision timeout in ms
       */
      constructor(timeout: number) {
        super();
        this.#timeout = timeout;
      }

      override add(value: T): this {
        super.add(value);

        const id = setTimeout(() => {
          super.delete(value);
          this.#timers.delete(id);
        }, this.#timeout);

        this.#timers.add(id);
        return this;
      }

      override clear(): void {
        super.clear();
        for (const id of this.#timers) {
          clearTimeout(id);
        }
        this.#timers.clear();
      }
    }

    const timeout = 200;
    const throttle = new Throttle<string>(timeout);
    const controllers = new Map<string, AbortController>();

    for await (const event of appWatcher) {
      const time = Math.floor(Date.now() / timeout);
      console.log(`FS Event`, event, time);

      // Update generated CSS variables
      // if (
      //   event.kind === "modify" &&
      //   event.paths.every((p) => [".html", ".css"].includes(extname(p)))
      // ) {
      //   if (!throttle.has(`css`)) {
      //     console.log("Generate css variables");
      //     await generateCSS();
      //     throttle.add(`css`);
      //   }
      // }

      for (const path of event.paths) {
        const relativePath = relative(Deno.cwd(), path);
        const dest = join(buildPath, relativePath);

        if (extname(path)) {
          // Build files
          const key = `file:${event.kind}:${relativePath}`;
          if (!throttle.has(key)) {
            throttle.add(key);

            if (["create", "modify", "rename"].includes(event.kind)) {
              // TODO distinguish, elements, libs etc
              await buildFile(path, dest);
              console.log("built", relativePath);
            } else if (event.kind === "remove") {
              try {
                if (dest.endsWith(".ts")) {
                  Deno.removeSync(dest.replace(ts_extension_regex, ".js"));
                } else {
                  Deno.removeSync(dest);
                }
              } catch (error) {
                if (!(error instanceof Deno.errors.NotFound)) {
                  throw error;
                }
              }
              console.log("removed", relativePath);
            }
          }
        } else {
          // Update folder structure
          const key = `folder:${event.kind}:${relativePath}`;
          if (!throttle.has(key)) {
            throttle.add(key);

            if (event.kind === "create") {
              Deno.mkdirSync(dest);
              console.log("created", relativePath);
            } else if (event.kind === "rename") {
              let matchingSourcePath = "";

              console.log([...throttle.values()]);
              // Heuristic to find the correlated renamed source
              const found = throttle.values().find((key) => {
                if (!key.startsWith(`folder:remove:`)) return false;

                matchingSourcePath = key.split(":").at(-1) as string;
                console.log("found matchingSourcePath:", matchingSourcePath);

                return true;
              });

              if (found) {
                controllers.get(matchingSourcePath)?.abort();
                controllers.delete(matchingSourcePath);

                Deno.renameSync(join(buildPath, matchingSourcePath), dest);
                console.log(`moved ${relativePath}`);
              } else {
                console.log("couldn't find rename source folder", path);
              }
            } else if (event.kind === "remove") {
              const controller = new AbortController();
              controllers.set(relativePath, controller);

              // Postpone deletion in case it's a rename
              setTimeoutWithAbort(
                () => {
                  try {
                    Deno.removeSync(dest, { recursive: true });
                    controllers.delete(relativePath);
                    console.log("removed", relativePath);
                  } catch (error) {
                    if (!(error instanceof Deno.errors.NotFound)) {
                      throw error;
                    }
                  }
                },
                timeout,
                controller.signal,
              );
            }

            // TODO: rebuild routes
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
        throttle.add(`reload`);
        console.log("Hot-Reloading...");
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send("reload");
          }
        }
      }
    }
  }
};
