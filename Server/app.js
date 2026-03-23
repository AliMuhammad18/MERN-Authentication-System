import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import connectDB from './config/mongodb.js';
import userModel from './Modles/userModel.js';

const app = express();
const port = process.env.PORT || 4000;
app.use(express.json());
app.use(cookieParser());
app.use(cors({credentials : true}));

await connectDB();

app.listen(port , ()=> console.log(`Server running on port : ${port}`));