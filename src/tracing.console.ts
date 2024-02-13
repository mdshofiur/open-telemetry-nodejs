// OTEL
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
   SimpleSpanProcessor,
   ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { trace } from '@opentelemetry/api';

// Instrumentations
import { ExpressInstrumentation } from 'opentelemetry-instrumentation-express';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

export default function setupConsoleExporter(serviceName:string) {
   const exporter = new ConsoleSpanExporter();

   const provider = new NodeTracerProvider({
      resource: new Resource({
         [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      }),
   });
   provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

   provider.register();

   registerInstrumentations({
      instrumentations: [
         new HttpInstrumentation(),
         new ExpressInstrumentation(),
         new MongoDBInstrumentation(),
      ],
      tracerProvider: provider,
   });

   return trace.getTracer(serviceName);
}
