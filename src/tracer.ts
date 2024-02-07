'use strict';

const opentelemetry = require('@opentelemetry/api');
import { SpanKind, Attributes } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
   Sampler,
   AlwaysOnSampler,
   SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import {
   SemanticAttributes,
   SemanticResourceAttributes as ResourceAttributesSC,
} from '@opentelemetry/semantic-conventions';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
// const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');


const { diag, DiagConsoleLogger, DiagLogLevel } = opentelemetry;
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);


/* -------------------------------------------------------------------------- */
/*            Set up the exporter based on the environment variable           */
/* -------------------------------------------------------------------------- */
const Exporter = (process.env.EXPORTER || '').toLowerCase().startsWith('z')
   ? ZipkinExporter
   : OTLPTraceExporter;


/* -------------------------------------------------------------------------- */
/*                               Set up tracing                               */
/* -------------------------------------------------------------------------- */
export const setupTracing = (serviceName: string) => {
   const provider = new NodeTracerProvider({
      resource: new Resource({
         [ResourceAttributesSC.SERVICE_NAME]: serviceName,
      }),
      sampler: filterSampler(ignoreHealthCheck, new AlwaysOnSampler()),
   });
   registerInstrumentations({
      tracerProvider: provider,
      instrumentations: [
         // Express instrumentation expects HTTP layer to be instrumented
         new HttpInstrumentation(),
         new ExpressInstrumentation(),
      ],
   });

   
   // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
   provider.register();

   /* -------------------------------------------------------------------------- */
   /*                              Add OTLP exporter                             */
   /* -------------------------------------------------------------------------- */
   const exporter = new Exporter({
      serviceName,
   });

   provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

   /* -------------------------------------------------------------------------- */
   /*                             Add Jaeger exporter                            */
   /* -------------------------------------------------------------------------- */
   const jaegerExporter = new JaegerExporter({
      serviceName: serviceName,
      agentHost: 'localhost',
      agentPort: 16686,
   });

   provider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));

   return opentelemetry.trace.getTracer(serviceName);
};



/* -------------------------------------------------------------------------- */
/*                            Filter function type                            */
/* -------------------------------------------------------------------------- */
type FilterFunction = (
   spanName: string,
   spanKind: SpanKind,
   attributes: Attributes,
) => boolean;

 /* -------------------------------------------------------------------------- */
 /*                           Filter sampler function                          */
 /* -------------------------------------------------------------------------- */
function filterSampler(filterFn: FilterFunction, parent: Sampler): Sampler {
   return {
      shouldSample(ctx, tid, spanName, spanKind, attr, links) {
         if (!filterFn(spanName, spanKind, attr)) {
            return { decision: opentelemetry.SamplingDecision.NOT_RECORD };
         }
         return parent.shouldSample(ctx, tid, spanName, spanKind, attr, links);
      },
      toString() {
         return `FilterSampler(${parent.toString()})`;
      },
   };
}

/* -------------------------------------------------------------------------- */
/*                    Ignore health check requests function                   */
/* -------------------------------------------------------------------------- */
function ignoreHealthCheck(
   spanName: string,
   spanKind: SpanKind,
   attributes: Attributes,
) {
   return (
      spanKind !== opentelemetry.SpanKind.SERVER ||
      attributes[SemanticAttributes.HTTP_ROUTE] !== '/health'
   );
}
