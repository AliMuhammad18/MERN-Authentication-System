import userModel from "../../Models/userModel.js";
import transporter from "../../config/transporter.js";
import redisClient from "../../config/redisClient.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {signAndSendAccessToken , signAndSendTempToken} from "../../utils/signAndSendJwt.js";

const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "missing fields" });
  }

  try {
    const userExists = await userModel.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const user = await userModel.create({ name, email, password });

    signAndSendAccessToken(user , res);

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "signupation Greetings !!",
      text: `Welcome to Ali's Authentication System Your account has been created with email id: ${email}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true , message : "user signed up successfully"});
  } catch (err) {
    console.error("error from signup controller",err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const continueWithGoogle = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    if(user.mfaEnabled){
      signAndSendTempToken(user, res);
      return res.status(200).json({success : true , message : "2FA is required"});
    }

    signAndSendAccessToken(user, res);

    res.status(200).json({ success: true , message : "user logged in successfully"});
  } catch (err) {
    console.error("error from continue with google controller",err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
 
const {email , password} = req.body;

 if(!email || !password){
  return res.status(400).json({success : false , message : "missing fields"});    
 }

 try{
  const user = await userModel.findOne({email});
 
  if(!user){
    return res.status(404).json({success : false , message : "user doesn't exists"});
  }

  const passwordCheck = await bcrypt.compare(password , user.password);

  if(!passwordCheck){
   return res.status(400).json({success : false , message : "Invalid Password"});
  }

  if(user.mfaEnabled){
      signAndSendTempToken(user, res);
      return res.status(200).json({success : true , message : "2FA is required"});
  }

  signAndSendAccessToken(user , res);

 res.status(200).json({ success: true , message : "user logged in successfully"});

}
catch(err){
  console.error("error from login controller",err);
  return res.status(500).json({success : false , message : err.message});
}
};

const logout = async (req, res) => {
    try{
        res.clearCookie("access_token" , {
          httpOnly : true,
          secure : process.env.NODE_ENV === "production",
          sameSite : process.env.NODE_ENV === "production" ? "none" : "strict",  
        });

        return res.status(200).json({success : true , message : "user logged out successfully"});

    }catch(err){
        console.error("error from logout controller",err);
        return res.status(500).json({success : false , message : err.message});
    }
}

const sendPasswordResetOtp = async (req , res) => { 
   
   const {email} = req.body;

   if(!email){
    return res.status(400).json({success : false , message : "missing fields"});
   }

   try{
   
    const user = await userModel.findOne({email});
   
    if(!user){
      return res.status(404).json({success : false , message : "user doesn't exists"});
    }

    const otp = crypto.randomInt(100000 , 1000000).toString();

    const mailOptions = {
      from : process.env.SENDER_EMAIL,
      to : email,
      subject : "Password Reset",
      text : `Your password reset OTP is : ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    
    user.passwordResetOtp.value = otp;
    user.passwordResetOtp.verified = false;

    await user.save();
        
    const sessionId = crypto.randomBytes(32).toString("hex");
    
    await redisClient.setEx(`Password Reset:${sessionId}` ,  60 * 7 , `${user._id}`);

    res.cookie("password_reset_session" , sessionId , {
      httpOnly : true,
      secure : process.env.NODE_ENV === "production",
      sameSite : process.env.NODE_ENV === "production" ? "none" : "strict",  
    });

    return res.status(200).json({success : true , message : "OTP sent successfully"});
   }
   catch(err){
    console.error("error from sendPasswordResetOtp controller" , err);
    return res.status(500).json({success : false , message : err.message});
   }
}

const verifyPasswordResetOtp = async (req , res) => { 
  
  const {otp} = req.body;
  
  const sessionId = req.cookies.password_reset_session;

  if(!otp){
    return res.status(400).json({success : false , message : "missing fields"});
  }

  try{
    const cachedSession = await redisClient.get(`Password Reset:${sessionId}`);

    if(!cachedSession){
      return res.status(404).json({success : false , message : "session not found"});
    }

    const user = await userModel.findById(cachedSession);

    if(!await bcrypt.compare(otp , user.passwordResetOtp.value)){
      return res.status(400).json({success : false , message : "invalid OTP"});
    }
 
    user.passwordResetOtp.value = null;
    user.passwordResetOtp.verified = true;
    await user.save();
    
    return res.status(200).json({success : true , message : "OTP verified successfully"});
  }
  catch(err){
    console.error("error from verifyPasswordResetOtp controller" , err);
    return res.status(500).json({success : false , message : err.message});
  }
}

const resetPassword = async (req , res) => {
  
  const sessionId = req.cookies.password_reset_session;

  if(!sessionId){
    return res.status(404).json({success : false , message : "session not found"});
  }
  
  const cachedSession = await redisClient.get(`Password Reset:${sessionId}`);
    
  if(!cachedSession){
      return res.status(404).json({success : false , message : "session expired"});
  }

 const user = await userModel.findById(cachedSession);
 
 if(!user.passwordResetOtp.verified){
  return res.status(400).json({success : false , message : "OTP not verified"});
 }

 const {newPassword} = req.body;

 if(!newPassword){
  return res.status(400).json({success : false , message : "missing fields"});
 }

 user.password = newPassword;
 user.passwordResetOtp.verified = false;
 
 await user.save();

 await redisClient.del(`Password Reset:${sessionId}`);

 return res.status(200).json({success : true , message : "password reset successfully"});
    
} 

export { signup, continueWithGoogle , login , logout , sendPasswordResetOtp , verifyPasswordResetOtp , resetPassword};

