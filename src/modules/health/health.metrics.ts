import {
  collectDefaultMetrics,
  Gauge,
  Registry,
} from "prom-client";

export const register = new Registry();

collectDefaultMetrics({ register });

export const healthGauge = new Gauge({
  name: "sust_preli_health",
  help: "1 when the service is healthy (OPENAI_API_KEY configured), 0 otherwise",
  registers: [register],
});
