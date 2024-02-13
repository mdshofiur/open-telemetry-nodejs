import { trace } from '@opentelemetry/api';
import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { setupJaegerExporter } from './tracing.jaeger';
import { api } from '@opentelemetry/sdk-node';

// setupJaegerExporter('example-express-server');

const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
dotenv.config();

const tracer = setupJaegerExporter('mongo-express');

app.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

app.get('/health', (req: Request, res: Response) => res.status(200).send('HEALTHY'));


app.get('/run_test', async (req: Request, res: Response) => {

   // const span = tracer.startSpan('run_test api', {
   //    kind: api.SpanKind.CLIENT,
   // });


   const span = api.trace
      .getTracer('example-express')
      .startSpan('client.makeRequest()', {
         kind: api.SpanKind.CLIENT,
      });

   api.context.with(api.trace.setSpan(api.context.active(), span), async () => {
      try {
         const createdCat = await axios.post(
            `http://localhost:${PORT}/cats`,
            {
               name: 'Tom',
               friends: ['Jerry'],
            },
            {
               headers: {
                  Authorization: 'secret_token',
               },
            },
         );
         res.status(201).send(createdCat.data);

         span.setStatus({ code: api.SpanStatusCode.OK });
         span.end();

      } catch (error: any) {
         console.error('Error:', error.message);
         res.status(500).send('Internal Server Error');

         span.setStatus({
            code: api.SpanStatusCode.ERROR,
            message: error.message,
         });
         span.end();

      }
   });
});

const getCrudController = () => {
   const router = express.Router();
   const resources: any[] = [];
   router.get('/', (req: Request, res: Response) => res.send(resources));
   router.post('/', (req: Request, res: Response) => {
      resources.push(req.body);
      return res.status(201).send(req.body);
   });
   return router;
};

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
   const { authorization } = req.headers;
   if (authorization && authorization.includes('secret_token')) {
      next();
   } else {
      res.sendStatus(401);
   }
};
app.use('/cats', authMiddleware, getCrudController());

app.listen(PORT, () => {
   console.log(`Listening on http://localhost:${PORT}`);
});
