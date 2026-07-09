import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { errorHandler } from "./plugins/error-handler";
import { applicationRoutes } from "./routes/applications";
import { candidateRoutes } from "./routes/candidates";

const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler(errorHandler);

await app.register(candidateRoutes, { prefix: "/api" });
await app.register(applicationRoutes, { prefix: "/api" });

const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
