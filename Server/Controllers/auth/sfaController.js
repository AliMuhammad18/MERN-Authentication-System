import userModel from "../../Models/userModel.js";
import transporter from "../../config/transporter.js";
import redisClient from "../../config/redisClient.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {signAndSendAccessToken , signAndSendTempToken , signAndSendRefreshToken , refreshTokenRevocation} from "../../utils/jwts.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";

const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError("missing fields", 400);
  }

  const userExists = await userModel.findOne({ email });

  if (userExists) {
    throw new AppError("User already exists", 400);
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
});

const continueWithGoogle = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  if(user.mfaEnabled){
    signAndSendTempToken(user, res);
    return res.status(200).json({success : true , message : "2FA is required"});
  }
    
  const refreshTokenFamilyId = crypto.randomUUID();
  signAndSendAccessToken(user, res);
  await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);

  res.status(200).json({ success: true , message : "user logged in successfully"});
});

const login = asyncHandler(async (req, res) => { 
   
  const {email , password} = req.body;

  if(!email || !password){
    throw new AppError("missing fields", 400);
  }

  const user = await userModel.findOne({email});
  
  if(!user){
    throw new AppError("user doesn't exists", 404);
  }

  const passwordCheck = await bcrypt.compare(password , user.password);

  if(!passwordCheck){
    throw new AppError("Invalid Password", 400);
  }

  if(user.mfaEnabled){
    signAndSendTempToken(user, res);
    return res.status(200).json({success : true , message : "2FA is required"});
  }
  
  const refreshTokenFamilyId = crypto.randomUUID();
  signAndSendAccessToken(user , res);
  await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);

  res.status(200).json({ success: true , message : "user logged in successfully"});
});

const logout = asyncHandler(async (req, res) => {
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
});

const sendPasswordResetOtp = asyncHandler(async (req , res) => { 
   
  const {email} = req.body;

  if(!email){
    throw new AppError("missing fields", 400);
  }

  const user = await userModel.findOne({email});
   
  if(!user){
    throw new AppError("user doesn't exists", 404);
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
});

const verifyPasswordResetOtp = asyncHandler(async (req , res) => { 
  
  const {otp} = req.body;
  const sessionId = req.cookies.password_reset_session;

  if(!otp){
    throw new AppError("missing fields", 400);
  }

  const cachedSession = await redisClient.get(`Password Reset:${sessionId}`);

  if(!cachedSession){
    throw new AppError("session not found", 404);
  }

  const user = await userModel.findById(cachedSession);

  if(!await bcrypt.compare(otp , user.passwordResetOtp.value)){
    throw new AppError("invalid OTP", 400);
  }
 
  user.passwordResetOtp.value = null;
  user.passwordResetOtp.verified = true;
  await user.save();
    
  return res.status(200).json({success : true , message : "OTP verified successfully"});
});

const resetPassword = asyncHandler(async (req , res) => {
  
  const sessionId = req.cookies.password_reset_session;

  if(!sessionId){
    throw new AppError("session not found", 404);
  }
  
  const cachedSession = await redisClient.get(`Password Reset:${sessionId}`);
    
  if(!cachedSession){
    throw new AppError("session expired", 404);
  }

  const user = await userModel.findById(cachedSession);
 
  if(!user.passwordResetOtp.verified){
    throw new AppError("OTP not verified", 400);
  }

  const {password} = req.body;

  if(!password){
    throw new AppError("missing fields", 400);
  }

  user.password = password;
  user.passwordResetOtp.verified = false;
  
  await user.save();

  await redisClient.del(`Password Reset:${sessionId}`);

  return res.status(200).json({success : true , message : "password reset successfully"});
});

const refreshAccessToken = asyncHandler(async (req , res) => {

  const user = await userModel.findById(req.id);
  if(!user){
    throw new AppError("user not found", 404);
  }
    
  // Pass remaining TTL from middleware so the expiry window is preserved across rotations
  await signAndSendRefreshToken(user , res , req.familyId , req.tokenTTL);
  signAndSendAccessToken(user , res);
  await redisClient.unlink(`Refresh:${req.jti}`);   

  return res.status(200).json({success : true , message : "access token refreshed successfully"});
});

export { signup, continueWithGoogle , login , logout , refreshAccessToken , sendPasswordResetOtp , verifyPasswordResetOtp , resetPassword};
