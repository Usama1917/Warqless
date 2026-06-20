import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(
  (
    err: { status?: number; statusCode?: number },
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    req.log?.error({ err }, "request failed");
    if (res.headersSent) return next(err);
    res
      .status(err.status ?? err.statusCode ?? 500)
      .json({ message: "Internal Server Error" });
  },
);

export default app;
