import { buildApp } from "./app";
import { env } from "./config/env";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.appPort, host: "0.0.0.0" });
    console.log(`Servidor rodando na porta ${env.appPort}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
