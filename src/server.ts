import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { default as axios } from 'axios';
import { RequestHandler } from 'express';
import { setupTracing } from './tracer';

setupTracing('example-express-server');

const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();

app.use(cors());
app.use(cookieParser());
dotenv.config();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

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

const authMiddleware: RequestHandler = (req, res, next) => {
   const { authorization } = req.headers;
   if (authorization && authorization.includes('secret_token')) {
      next();
   } else {
      res.sendStatus(401);
   }
};

app.use(express.json());
app.get('/health', (req, res) => res.status(200).send('HEALTHY')); // endpoint that is called by framework/cluster
app.get('/run_test', async (req, res) => {
   // Calls another endpoint of the same API, somewhat mimicing an external API call
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

   return res.status(201).send(createdCat.data);
});
app.use('/cats', authMiddleware, getCrudController());




app.listen(PORT, () => {
   console.log(`Listening on http://localhost:${PORT}`);
});
