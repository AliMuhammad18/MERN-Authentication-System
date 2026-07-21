import userModel from "../../Models/userModel.js";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import {generateBackupCodes , saveBackupCodes , verifyBackupCode} from "../../utils/backupCodes.js";
import jwt from "jsonwebtoken";
import { signAndSendAccessToken } from "../../utils/jwts.js";

const enableMfa = async (req , res) =>{

   try {

    const user = await userModel.findById(req.id);

    if(!user){
      return res.status(401).json({success : false , message : "user not found"});
    }

    if(user.mfaEnabled){
       return res.status(400).json({success : false , message : "MFA already enabled"}); 
    }

    const secret = speakeasy.generateSecret({
      name : `${user.name}`,
      issuer : "Ali's Authentication System"
    });

    user.tempMfaSecret = secret.base32;
    await user.save();

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
      message : "Scan the QR code to enable MFA",
      success : true,
      qrCodeDataUrl
    });

   }
   catch(err){
     console.error("error from enable MFA controller" , err);
     return res.status(500).json({success : false , message : err.message});
   }

}

const verifyMfa = async (req , res) =>{
 
  try{
   
    const user = await userModel.findById(req.id);

    if(!user){
      return res.status(404).json({success : false , message : "user not found"});
    }
    
    if(user.tempMfaSecret){
      const checkOtp = speakeasy.totp.verify({
        secret : user.tempMfaSecret,
        encoding : "base32",
        token : req.body.otp,
        window : 1
      });
      
      if(!checkOtp){
        return res.status(400).json({success : false , message : "Invalid OTP"});
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
        return res.status(400).json({success : false , message : "Invalid OTP"});
      }
     
      res.clearCookie("temp_token" , {
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
       sameSite: "strict",
      });

      signAndSendAccessToken(user , res);

      return res.status(200).json({success : true , message : "MFA Verified successfully"});
    } 
  }
  catch(err){
    console.error("error from verify MFA controller" , err);
    return res.status(500).json({success : false , message : err.message});
  }
}


const disableMfa = async (req , res) => {
  
  try{

     const user = await userModel.findById(req.id);

     if(!user){
      return res.status(404).json({success : false , message : "user not found"});
     }

     if(!user.mfaEnabled){
      return res.status(400).json({success : false , message : "2FA is already disabled"});
     }

     return res.status(200).json({success : true , message : "Enter the 6 digit OTP from your authenticator app to disable 2FA"});
  }
  
  catch(err){
    console.error("error from disable MFA controller" , err);
    return res.status(500).json({success : false , message : err.message});
  }
}

const verifyOtpToDisableMfa = async (req , res) =>{
   try{
    
    const user = await userModel.findById(req.id);
    if(!user){
      return res.status(404).json({success : false , message : "user not found"});
    }

    if(!user.mfaEnabled){
      return res.status(400).json({success : false , message : "2FA is already disabled"});
    }

    const checkOtp = speakeasy.totp.verify({
      secret : user.mfaSecret,
      encoding : "base32",
      token : req.body.otp,
      window : 1
    });
    
    if(!checkOtp){
      return res.status(400).json({success : false , message : "Invalid OTP"});
    }
    
    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.backupCodes = [];
    await user.save();
        
    return res.status(200).json({success : true , message : "2FA disabled successfully"});

   }
   catch(err){
    console.error("error from verifyOtpToDisableMfa controller" , err);
    return res.status(500).json({success : false , message : err.message});
   }
} 

const verifyBackupCodeToDisableMfa = async (req , res) =>{
  try{

   const user = await userModel.findById(req.id);
   if(!user){
    return res.status(404).json({success : false , message : "user not found"});
   }

   if(!user.mfaEnabled){
    return res.status(400).json({success : false , message : "2FA is already disabled"});
   }

   const checkBackupCode = await verifyBackupCode(user , req.body.backupCode);
   if(!checkBackupCode){
    return res.status(400).json({success : false , message : "Invalid backup code"});
   }
   
   user.mfaEnabled = false;
   user.mfaSecret = null;
   user.backupCodes = [];
   await user.save();
   
   return res.status(200).json({success : true , message : "2FA disabled successfully"});
  
  }
  catch(err){
    console.error("error from verifyBackupCodeToDisableMfa controller" , err);
    return res.status(500).json({success : false , message : err.message});
  }
} 

const loginWithBackupCode = async (req , res) =>{
   
    try{
    
    const user = await userModel.findById(req.id);
    if(!user){
      return res.status(404).json({success : false , message : "user not found"});
    }

    if(!user.mfaEnabled){
      return res.status(400).json({success : false , message : "2FA is already disabled"});
    }

    const checkBackupCode = await verifyBackupCode(user , req.body.backupCode);
    if(!checkBackupCode){
      return res.status(400).json({success : false , message : "Invalid backup code"});
    }
    
    res.clearCookie('temp_token' , {
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });      

    signAndSendAccessToken(user , res);
    
    return res.status(200).json({success : true , message : "User logged in successfully"});
    
   }
   catch(err){
    console.error("error from loginWithBackupCode controller" , err);
    return res.status(500).json({success : false , message : err.message});
   }
}

export {enableMfa , verifyMfa , loginWithBackupCode , disableMfa , verifyBackupCodeToDisableMfa , verifyOtpToDisableMfa};
