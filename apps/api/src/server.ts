import { buildApp } from "./app";

const app = await buildApp({ logger: true });

const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
