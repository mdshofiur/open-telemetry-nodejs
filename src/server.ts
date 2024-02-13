import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { api } from '@opentelemetry/sdk-node';
import { setupTracing } from './tracer';

const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
dotenv.config();

const tracer = setupTracing('user-fetcher');

app.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

app.get('/user', async (req: Request, res: Response) => {

   const span = tracer.startSpan(`client`, {
      kind: api.SpanKind.CLIENT,
   });

   api.context.with(api.trace.setSpan(api.context.active(), span), async () => {
      try {
         const response = await axios.get(
            'https://jsonplaceholder.typicode.com/users',
         );
         res.json(response.data);
         span.setStatus({ code: api.SpanStatusCode.OK });
         // trace.getTracer('user').startSpan('fetching user.....').end();
      } catch (error: any) {
         res.status(500).json({ error: error.message });
         span.setStatus({
            code: api.SpanStatusCode.ERROR,
            message: error.message,
         });
      } finally {
         span.end();
      }
   });
});

app.listen(PORT, () => {
   console.log(`Listening on http://localhost:${PORT}`);
});
