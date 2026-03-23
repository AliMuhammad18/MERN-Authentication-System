import mongoose from 'mongoose';

const connectDB = async ()=>{ 
      try{
       await mongoose.connect(`${process.env.MONGODB_URI}`)
       console.log('connected to DB');
      }catch(err){
        console.error(err.messasge);
      }
  }
export default connectDB ;