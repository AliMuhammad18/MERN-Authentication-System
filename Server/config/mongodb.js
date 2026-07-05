import mongoose from 'mongoose';
import dotenv from 'dotenv';

const connectDB = async ()=>{
      try{
       await mongoose.connect(`${process.env.MONGODB_URI}`)
       console.log('connected to DB');
      }catch(err){
        console.error(err.message);
      }
  }
export default connectDB ;  