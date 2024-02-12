import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { setupTracing } from './tracer';
import * as api from '@opentelemetry/api';

setupTracing('example-express-server');

const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();

app.use(cors());
app.use(cookieParser());
dotenv.config();

app.get('/', (req, res) => {
   res.send('Hello, World!');
});

const getCrudController = () => {
   const router = express.Router();
   const resources: any[] = [];
   router.get('/', (req, res) => res.send(resources));
   router.post('/', (req, res) => {
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

app.use(express.json());
app.get('/health', (req, res) => res.status(200).send('HEALTHY'));

app.get('/run_test', async (req, res) => {
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
   } catch (error: any) {
      console.error('Error:', error.message);
      res.status(500).send('Internal Server Error');
   }
});

app.use('/cats', authMiddleware, getCrudController());

const tracer = setupTracing('example-expres');

// Define a route
app.get('/api/make-request', async (req: Request, res: Response) => {
   const span = tracer.startSpan('client 55', {
      kind: api.SpanKind.CLIENT,
   });

   // const span = api.trace
   //    .getTracer('example-express')
   //    .startSpan('client.makeRequest()', {
   //       kind: api.SpanKind.CLIENT,
   //    });

   api.context.with(api.trace.setSpan(api.context.active(), span), async () => {
      try {
         const response = await axios.get(`http://localhost:${PORT}/run_test`);
         console.log('status:', response.statusText);
         span.setStatus({ code: api.SpanStatusCode.OK });
          span.end();
      } catch (e: any) {
         console.error('failed:', e.message);
         span.setStatus({
            code: api.SpanStatusCode.ERROR,
            message: e.message,
         });
          span.end();
      } 
   });
   res.send('Request initiated!');
});

app.listen(PORT, () => {
   console.log(`Listening on http://localhost:${PORT}`);
});
