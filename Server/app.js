import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import connectDB from './config/mongodb.js';
import passport from 'passport';
import './config/PassportStrategies/googleStrategy.js';
import authRouter from './Routers/authRouter.js';
import errorHandler from './Middlewares/errorHandler.js';
import logger from './config/logger.js';
import helmet from 'helmet';


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'Client', 'dist')));
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(passport.initialize());

app.use(express.json());
app.use(cookieParser());

await connectDB();


app.use('/api/auth' , authRouter);

app.get('/health', (req, res) => {
  res.status(200).json({message: "OK!"});
});

app.get('{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Client', 'dist', 'index.html'));
});

app.listen(port , () => logger.info(`Server running on port : ${port}`));

app.use(errorHandler);

