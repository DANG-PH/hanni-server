// Nạp TRƯỚC mọi module của app (NODE_OPTIONS=--require) để vá được http, express, pg, ioredis.
// Địa chỉ gửi vết và tỉ lệ lấy mẫu đọc từ biến OTEL_* chuẩn: xem infra/k8s/app/config.yaml.
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { NestInstrumentation } = require('@opentelemetry/instrumentation-nestjs-core');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { IORedisInstrumentation } = require('@opentelemetry/instrumentation-ioredis');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) =>
        req.url?.includes('/health') || req.url?.includes('/metrics') || false,
    }),
    new ExpressInstrumentation(),
    new NestInstrumentation(),
    new PgInstrumentation({ enhancedDatabaseReporting: false }),
    new IORedisInstrumentation(),
  ],
});

sdk.start();
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => void sdk.shutdown());
}
