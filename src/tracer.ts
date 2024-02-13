'use strict';

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';

export const setupTracing = (serviceName: string) => {
   const provider = new NodeTracerProvider({
      resource: new Resource({
         [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      }),
   });

   const exporter = new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
   });

   provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

   provider.register();

   registerInstrumentations({
      instrumentations: [
         new HttpInstrumentation(),
         new ExpressInstrumentation(),
         new MongooseInstrumentation(),
      ],
   });

   console.log('Tracing initialized');
   
    return trace.getTracer(serviceName);
};

// trace.getTracer('test').startSpan('test span').end();
