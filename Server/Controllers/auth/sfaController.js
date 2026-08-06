import userModel from "../../Models/userModel.js";
import redisClient from "../../config/redisClient.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {signAndSendAccessToken , signAndSendTempToken , signAndSendRefreshToken , refreshTokenRevocation} from "../../utils/jwts.js";
import {sendSignupOtpEmail , sendLoginNotificationEmail , sendPasswordResetOtpEmail} from "../../utils/emailService.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";

const sendSignupOtp = asyncHandler(async (req, res) => {
  const {email} = req.body;

  if (!email) {
    throw new AppError("missing fields", 400);
  }

  const otp = crypto.randomInt(100000 , 1000000).toString();
            
  const sessionId = crypto.randomBytes(32).toString("hex");
  
  const storedOtp = await bcrypt.hash(otp , + process.env.SALT_ROUNDS);
  const storedCredentials = {email , signupOtp : {value : storedOtp , verified : false}};
    
  await redisClient.setEx(`Signup:${sessionId}` ,  60 * 10 , JSON.stringify(storedCredentials));

  res.cookie("signup_session" , sessionId , {
    httpOnly : true,
    secure : process.env.NODE_ENV === "production",
    sameSite : "strict",
    maxAge : 60 * 10 * 1000,
  });

  await sendSignupOtpEmail(email , otp);

  return res.status(200).json({success : true , message : "OTP sent successfully"});


});

const verifySignupOtp = asyncHandler(async (req, res) => { 
  
  const {otp} = req.body;
  const sessionId = req.cookies.signup_session;

  if(!otp || !sessionId){
    throw new AppError("missing fields", 400);
  }
    
  const cachedSession = await redisClient.get(`Signup:${sessionId}`);

  if(!cachedSession){
    throw new AppError("session expired", 404);
  }

  const userCredentials = JSON.parse(cachedSession);
  const {signupOtp} = userCredentials;
  
  if(!await bcrypt.compare(otp , signupOtp.value)){
    throw new AppError("Invalid OTP", 400);
  }

  userCredentials.signupOtp.verified = true;
  await redisClient.setEx(`Signup:${sessionId}` ,  60 * 10 , JSON.stringify(userCredentials));

  return res.status(200).json({success : true , message : "OTP verified successfully"});
});

const finishSignup = asyncHandler(async (req , res) => {
  
  const sessionId = req.cookies.signup_session;

  if(!sessionId){
    throw new AppError("session not found", 404);
  }

  const cachedSession = await redisClient.get(`Signup:${sessionId}`);

  if(!cachedSession){
    throw new AppError("session expired", 404);
  }

  const userCredentials = JSON.parse(cachedSession);
  
  if(!userCredentials.signupOtp.verified){
    throw new AppError("OTP not verified", 401);
  }

  const {name , password} = req.body;

  const user = await userModel.create({
    name,
    email : userCredentials.email,
    password,
  });
    
  await redisClient.del(`Signup:${sessionId}`);
 
  res.clearCookie("signup_session" , {
    httpOnly : true,
    secure : process.env.NODE_ENV === "production",
    sameSite : "strict",
  });

  const refreshTokenFamilyId = crypto.randomUUID();
  signAndSendAccessToken(user , res);
  await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);

  return res.status(200).json({success : true , message : "user created successfully"});

});
  
const continueWithGoogle = asyncHandler(async (req, res) => {
  const user = req.user;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  if(user.mfaEnabled){
    signAndSendTempToken(user, res);
    return res.redirect(`${clientUrl}/verify-2fa`);
  }
    
  const refreshTokenFamilyId = crypto.randomUUID();
  signAndSendAccessToken(user, res);
  await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);

  return res.redirect(`${clientUrl}/home`);
});

const login = asyncHandler(async (req, res) => { 
   
  const {email , password} = req.body;

  if(!email || !password){
    throw new AppError("missing fields", 400);
  }

  const user = await userModel.findOne({email});
  
  if(!user || !await bcrypt.compare(password , user.password)){
    throw new AppError("Invalid Email or Password", 400);
  }

  if(user.mfaEnabled){
    signAndSendTempToken(user, res);
    return res.status(200).json({success : true , message : "2FA is required"});
  }
  
  const refreshTokenFamilyId = crypto.randomUUID();
  
  signAndSendAccessToken(user , res);
  await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);
  await sendLoginNotificationEmail(email , user.name);

  return res.status(200).json({ success: true , message : "user logged in successfully"});
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
  const otp = crypto.randomInt(100000 , 1000000).toString();
  const sessionId = crypto.randomBytes(32).toString("hex");
  const otpHash = await bcrypt.hash(otp , +process.env.SALT_ROUNDS);
  
  const storedOtp = {value : otpHash , verified : false};
  
  const value = {userId : user?.id , otp : storedOtp};

  await redisClient.setEx(`Password Reset:${sessionId}` ,  60 * 10 , JSON.stringify(value));

  res.cookie("password_reset_session" , sessionId , {
    httpOnly : true,
    secure : process.env.NODE_ENV === "production",
    sameSite : "strict",
    maxAge : 60 * 10 * 1000,  
  });
  
  await sendPasswordResetOtpEmail(email , otp);

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

  const sessionRawData = await redisClient.get(`Password Reset:${sessionId}`);
  const sessionData = JSON.parse(sessionRawData);

  if(!await bcrypt.compare(otp , sessionData.otp.value)){
    throw new AppError("invalid OTP", 401);
  }
  
  if(!sessionData.userId){
    throw new AppError("user doesn't exist. Create new account", 404);
  }
  
  sessionData.otp.verified = true;
  await redisClient.set(`Password Reset:${sessionId}` , JSON.stringify(sessionData) , {KEEPTTL : true});

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

  const sessionRawData = await redisClient.get(`Password Reset:${sessionId}`);
  const sessionData = JSON.parse(sessionRawData);
 
  if(!sessionData.otp.verified){
    throw new AppError("OTP not verified", 400);
  }
  
  const user = await userModel.findById(sessionData.userId);
  
  const {password} = req.body;

  if(!password){
    throw new AppError("missing fields", 400);
  }

  user.password = password;
  await user.save();

  await redisClient.unlink(`Password Reset:${sessionId}`);
  
  res.clearCookie("password_reset_session" , {
    httpOnly : true,
    secure : process.env.NODE_ENV === "production",
    sameSite : "strict",
    maxAge : 60 * 10 * 1000,
  });

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

const getMe = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.id).select("name email mfaEnabled");

  if (!user) {
    throw new AppError("user not found", 404);
  }

  return res.status(200).json({
    success: true,
    user: {
      name: user.name,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
    },
  });
});

export {sendSignupOtp , verifySignupOtp , finishSignup , continueWithGoogle , login , logout , refreshAccessToken , sendPasswordResetOtp , verifyPasswordResetOtp , resetPassword, getMe};
