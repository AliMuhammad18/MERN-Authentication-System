import userModel from "../../Models/userModel.js";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import {generateBackupCodes , saveBackupCodes , verifyBackupCode} from "../../utils/backupCodes.js";
import { signAndSendAccessToken , signAndSendRefreshToken } from "../../utils/jwts.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";

const enableMfa = asyncHandler(async (req , res) => {

  const user = await userModel.findById(req.id);

  if(!user){
    throw new AppError("user not found", 401);
  }

  if(user.mfaEnabled){
    throw new AppError("MFA already enabled", 400);
  }

  const secret = speakeasy.generateSecret({
    name : `${user.name}`,
    issuer : "Ali's Authentication System"
  });

  user.tempMfaSecret = secret.base32;
  await user.save();

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

  return res.status(200).json({
    message : "Scan the QR code With Your Authenticator App to enable 2FA",
    success : true,
    qrCodeDataUrl
  });

});

const verifyMfa = asyncHandler(async (req , res) => {
   
  const user = await userModel.findById(req.id);

  if(!user){
    throw new AppError("user not found", 404);
  }
    
  if(user.tempMfaSecret){
    const checkOtp = speakeasy.totp.verify({
      secret : user.tempMfaSecret,
      encoding : "base32",
      token : req.body.otp,
      window : 1
    });
      
    if(!checkOtp){
      throw new AppError("Invalid OTP", 400);
    }
      
    user.mfaSecret = user.tempMfaSecret;
    user.mfaEnabled = true;
    user.tempMfaSecret = null;

    let codes = generateBackupCodes();
    await saveBackupCodes(user , codes);
    await user.save();
      
    res.clearCookie("access_token" , {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });  
      
    signAndSendAccessToken(user , res);

    return res.status(200).json({backupcodes :  codes , success : true , message : "MFA Enabled successfully"});
   }

   else if(user.mfaSecret){

    const checkOtp = speakeasy.totp.verify({
      secret : user.mfaSecret,
      encoding : "base32",
      token : req.body.otp,
      window : 1
    });
      
    if(!checkOtp){
      throw new AppError("Invalid OTP", 400);
    }
     
    res.clearCookie("temp_token" , {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const refreshTokenFamilyId = crypto.randomUUID();
    signAndSendAccessToken(user , res);
    await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);

    return res.status(200).json({success : true , message : "MFA Verified successfully"});
  } 
});


const verifyOtpToDisableMfa = asyncHandler(async (req , res) => {
    
  const user = await userModel.findById(req.id);
  if(!user){
    throw new AppError("user not found", 404);
  }

  if(!user.mfaEnabled){
    throw new AppError("2FA is already disabled", 400);
  }

  const checkOtp = speakeasy.totp.verify({
    secret : user.mfaSecret,
    encoding : "base32",
    token : req.body.otp,
    window : 1
  });
    
  if(!checkOtp){
    throw new AppError("Invalid OTP", 400);
  }
    
  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.backupCodes = [];
  await user.save();
        
  return res.status(200).json({success : true , message : "2FA disabled successfully"});
});

const verifyBackupCodeToDisableMfa = asyncHandler(async (req , res) => {

  const user = await userModel.findById(req.id);
  if(!user){
    throw new AppError("user not found", 404);
  }

  if(!user.mfaEnabled){
    throw new AppError("2FA is already disabled", 400);
  }

  const checkBackupCode = await verifyBackupCode(user , req.body.backupCode);
  if(!checkBackupCode){
    throw new AppError("Invalid backup code", 400);
  }
   
  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.backupCodes = [];
  await user.save();
   
  return res.status(200).json({success : true , message : "2FA disabled successfully"});
});

const loginWithBackupCode = asyncHandler(async (req , res) => {
    
  const user = await userModel.findById(req.id);
  if(!user){
    throw new AppError("user not found", 404);
  }

  if(!user.mfaEnabled){
    throw new AppError("2FA is already disabled", 400);
  }

  const checkBackupCode = await verifyBackupCode(user , req.body.backupCode);
  if(!checkBackupCode){
    throw new AppError("Invalid backup code", 400);
  }
    
  res.clearCookie('temp_token' , {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  });      

  const refreshTokenFamilyId = crypto.randomUUID();
  signAndSendAccessToken(user , res);
  await signAndSendRefreshToken(user , res , refreshTokenFamilyId , 60 * 60 * 24);
    
  return res.status(200).json({success : true , message : "User logged in successfully"});
});

export {enableMfa , verifyMfa , loginWithBackupCode , verifyBackupCodeToDisableMfa , verifyOtpToDisableMfa};