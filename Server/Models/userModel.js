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

  createdAt: {
    type: Date,
    default: Date.now,
  }

});

userSchema.methods.comparePassword = async function (candidatePassword){
  let match = await bcrypt.compare(candidatePassword, this.password);
  return match ; 
}

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