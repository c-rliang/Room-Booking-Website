import express, { type Express, type Request, type Response, type NextFunction } from "express";
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
app.use(express.json({ limit: "64kb", strict: true }));

app.use("/api", router);
app.use((err: { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  const tooLarge = err.type === "entity.too.large";
  res.status(tooLarge ? 413 : 400).json({
    code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
    error: tooLarge ? "This conversation is too large. Start a new chat." : "Invalid request. Please send valid JSON and retry.",
  });
});

export default app;
