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
  
  passwordResetOtp : {
    value : {type: String , default : null},
    verified : {type : Boolean , default : false}
  },

  createdAt : {type : Date , default : Date.now}

});

userSchema.pre("save" , async function(){

   const user = this;
  
   if(user.isModified("password")){
     const saltRounds = 10;
     const hashedPassword = await bcrypt.hash(user.password , saltRounds);
     user.password = hashedPassword;
    }
   
    if(user.isModified("passwordResetOtp.value")){

      if(!user.passwordResetOtp.value){
        return;
      }

      const saltRounds = 10;
      const hashedOtp = await bcrypt.hash(user.passwordResetOtp.value , saltRounds);
      user.passwordResetOtp.value = hashedOtp;
    }

});

const userModel = mongoose.models.userModel || mongoose.model('userModel' , userSchema);

export default userModel;