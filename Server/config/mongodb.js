import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const connectDB = async ()=>{
      try{
       await mongoose.connect(`${process.env.MONGODB_URI}`)
       logger.info('Connected to MongoDB');
      }catch(err){
        logger.error('MongoDB connection failed:', err.message);
      }
  }
export default connectDB ;  