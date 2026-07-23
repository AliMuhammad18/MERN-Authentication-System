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
 

const app = express();
const port = process.env.PORT || 4000;


app.use(passport.initialize());

app.use(express.json());
app.use(cookieParser());
app.use(cors({credentials : true}));

await connectDB();


app.use('/api/auth' , authRouter);

// Centralized error handler — must be the last middleware
app.use(errorHandler);

app.listen(port , ()=> logger.info(`Server running on port : ${port}`));