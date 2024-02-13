// OpenTelemetry
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { trace } from '@opentelemetry/api';
// Exporter
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
// Instrumentations
import { ExpressInstrumentation } from 'opentelemetry-instrumentation-express';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

export function setupJaegerExporter(serviceName: string) {
   // Provider
   const provider = new NodeTracerProvider({
      resource: new Resource({
         [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      }),
   });

   provider.register();

   // Instrumentations Registration
   registerInstrumentations({
      instrumentations: [
         new HttpInstrumentation(),
         new ExpressInstrumentation(),
         // new ExpressInstrumentation({
         //    requestHook: (span, requestInfo) => {
         //       span.setAttribute(
         //          'http.request.body',
         //          JSON.stringify(requestInfo.req.body),
         //       );
         //    },
         // }),
         new MongoDBInstrumentation(),
      ],
      tracerProvider: provider,
   });

   // Exporter
   const exporter = new JaegerExporter({
      serviceName: serviceName,
      host: 'localhost',
      port: 16686,
   });

   // Processor
   provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

   return trace.getTracer(serviceName);
}
