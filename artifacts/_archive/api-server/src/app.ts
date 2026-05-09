import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const rawCorsOrigins = process.env.CORS_ORIGINS?.trim();
const corsOrigin: CorsOptions["origin"] =
  !rawCorsOrigins || rawCorsOrigins === "*"
    ? true
    : rawCorsOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
