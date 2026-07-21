import userModel from "../../Models/userModel.js";
import transporter from "../../config/transporter.js";
import redisClient from "../../config/redisClient.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {signAndSendAccessToken , signAndSendTempToken , signAndSendRefreshToken , refreshTokenRevocation} from "../../utils/jwts.js";

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
    
    const refreshTokenFamilyId = crypto.randomUUID();
    signAndSendAccessToken(user , res);
    await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);
    
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Signupation Greetings !!",
      text: `Welcome to Ali's Authentication System Your account has been created with email: ${email}`,
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
    
    const refreshTokenFamilyId = crypto.randomUUID();
    signAndSendAccessToken(user, res);
    await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);

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
  
  const refreshTokenFamilyId = crypto.randomUUID();
  signAndSendAccessToken(user , res);
  await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);


 res.status(200).json({ success: true , message : "user logged in successfully"});

}
catch(err){
  console.error("error from login controller",err);
  return res.status(500).json({success : false , message : err.message});
}
};

const logout = async (req, res) => {
    
  try{
       
        const refreshToken = req.cookies.refresh_token;
        if(refreshToken){
          const payload = jwt.decode(refreshToken);
          if(payload?.familyId){
            await refreshTokenRevocation(payload.familyId);
          }
        }

        res.clearCookie("access_token" , {
          httpOnly : true,
          secure : process.env.NODE_ENV === "production",
          sameSite : "strict"
        });

        res.clearCookie("refresh_token" , {
          httpOnly : true,
          secure : process.env.NODE_ENV === "production",
          sameSite : "strict"
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
      sameSite : "strict",  
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

 const {password} = req.body;
 

 if(!password){
  return res.status(400).json({success : false , message : "missing fields"});
 }

 user.password = password;
 user.passwordResetOtp.verified = false;
 
 await user.save();

 await redisClient.del(`Password Reset:${sessionId}`);

 return res.status(200).json({success : true , message : "password reset successfully"});
    
} 

const refreshAccessToken = async (req , res) => {

   try{
    const user = await userModel.findById(req.id);
    if(!user){
      return res.status(404).json({success : false , message : "user not found"});
    }
    
    // Pass remaining TTL from middleware so the expiry window is preserved across rotations
    await signAndSendRefreshToken(user , res , req.familyId , req.tokenTTL);
    signAndSendAccessToken(user , res);
    await redisClient.unlink(`Refresh:${req.jti}`);   

    return res.status(200).json({success : true , message : "access token refreshed successfully"});
   }
   catch(err){
    console.error("error from refreshAccessToken controller" , err);
    return res.status(500).json({success : false , message : err.message});
   }
}
export { signup, continueWithGoogle , login , logout , refreshAccessToken , sendPasswordResetOtp , verifyPasswordResetOtp , resetPassword};

