import mongoose from "mongoose";
import bcrypt from "bcryptjs";

 const userSchema = new mongoose.Schema({
  name: { 
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    default: null,
  },

  googleId: {
    type: String,
    default: null
  },

  mfaEnabled: {
    type: Boolean,
    default: false
  },

  otp: {
    codeHash : String,

    expiresAt: {
      type : Date,
      index : true
    },

    attempts: {
      type: Number,
      default: 5
    },

    use: {
      type: String,
      enum: ["register", "reset", "mfa"]
    }
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }

});

userSchema.methods.comparePassword = async function (candidatePassword){
  let match = await bcrypt.compare(candidatePassword, this.password);
  return match ; 
}

userSchema.pre("save" , async function(next){
  try{
   const user = this;
  
   if(user.isModified("password")){
     const saltRounds = 10;
     const hashedPassword = await bcrypt.hash(user.password , saltRounds);
     user.password = hashedPassword;
   }
  }
  catch(err){
    next(err);
  } 

 next();
});

const userModel = mongoose.models.userModel || mongoose.model('userModel' , userSchema);
export default userModel;