import mongoose from "mongoose";
import bcrypt from "bcryptjs";

 const userSchema = new mongoose.Schema({
  name: { 
    type: String,
    required: true,
  },

  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password : String,

  googleId : String,

  mfaEnabled : {type : Boolean, default : false},
  
  tempMfaSecret : String,
  
  mfaSecret : String,

  backupCodes : [{
    code : String,
    used : {type: Boolean , default : false},
    usedAt : {type: Date , default : null},
  }],
  
  createdAt : {type : Date , default : Date.now}

});

userSchema.pre("save" , async function(){

   const user = this;
  
   if(user.isModified("password")){
     const saltRounds = 10;
     const hashedPassword = await bcrypt.hash(user.password , saltRounds);
     user.password = hashedPassword;
   
    }
});

const userModel = mongoose.models.userModel || mongoose.model('userModel' , userSchema);

export default userModel;