import express from 'express';
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
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(passport.initialize());

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

await connectDB();


app.use('/api/auth' , authRouter);

app.get('/health', (req, res) => {
  res.status(200).json({message: "OK!"});
});

app.use(errorHandler);

app.listen(port , ()=> logger.info(`Server running on port : ${port}`));