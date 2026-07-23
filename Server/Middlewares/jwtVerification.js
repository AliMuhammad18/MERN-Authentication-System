import jwt from 'jsonwebtoken';
import redisClient from '../config/redisClient.js';
import {refreshTokenRevocation} from "../utils/jwts.js";
import logger from '../config/logger.js';

const tokenVerification = async (req , res , next) => {
     
const tempToken = req.cookies.temp_token;
const accessToken = req.cookies.access_token;

if(accessToken) {
  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
    if(err)
       return res.status(401).json({ success: false, message: "Token verification failed" });
    req.id = payload.id;
    next();
  });
} 

else if(tempToken){
  jwt.verify(tempToken, process.env.TEMP_TOKEN_SECRET, (err, payload) => {
    if(err) 
      return res.status(401).json({ success: false, message: "Token verification failed" });
    req.id = payload.id;
    next();
  });
} 
else {
  return res.status(401).json({ success: false, message: "Access denied token not found" });
}

     
}   

const accessTokenVerification = async (req , res , next) => {
     
try{
   const token = req.cookies.access_token;
   if(!token){
    return res.status(401).json({success : false , message : "Access denied token not found"});        
   }

   jwt.verify(token , process.env.ACCESS_TOKEN_SECRET , (err , payload) => {
    if(err){
      return res.status(401).json({success : false , message : "Token verification failed"});
    }
    else{
      req.id = payload.id;
      next();
    }
   });
}
catch(err){
   console.error("error from accessTokenVerification middleware" , err)
   return res.status(500).json({success : false , message : err.message});
}    
}

const refreshTokenVerification = async (req , res , next) => {
  
  const refreshToken = req.cookies.refresh_token;
  
  if(!refreshToken){
    return res.status(403).json({success : false , message : "Forbidden: Refresh token not found"});
  }
  
  jwt.verify(refreshToken , process.env.REFRESH_TOKEN_SECRET , async (err , payload) => {
    if(err){
      return res.status(403).json({success : false , message : "Forbidden: Invalid refresh token"});
    }
    else{

      // Acquire an atomic per-JTI lock 
      // SET NX (set-if-not-exists) is a single atomic Redis operation.
      // Only ONE caller can create this key; every other concurrent caller gets null back.
      // EX 10 → the lock auto-expires after 10 seconds (no manual release needed).
      const lockAcquired = await redisClient.set(
        `Lock:Refresh:${payload.jti}`,
        '1',
        { NX: true, EX: 10 }
      );

      if(!lockAcquired){
        return res.status(429).json({success : false , message : "Refresh already in progress, please retry shortly"});
      }

      const rawData = await redisClient.get(`Refresh:${payload.jti}`);
      const tokenData = rawData ? JSON.parse(rawData) : null;
      
      // Reuse Detection 
      // If the key is gone it means this token was already rotated
      // or is being replayed by an attacker. Revoke the entire family.
      if(!tokenData){
        await refreshTokenRevocation(payload.familyId);
        logger.security(`Refresh token reuse detected — family ${payload.familyId} revoked`);
        return res.status(403).json({success : false , message : "Forbidden: Invalid refresh token"});
      }

      // Carry remaining TTL forward
      // Preserve the original expiry window instead of resetting it to a full day.
      const remainingTTL = await redisClient.ttl(`Refresh:${payload.jti}`);

      req.id = payload.id;
      req.jti = payload.jti;
      req.familyId = payload.familyId;
      req.tokenTTL = remainingTTL > 0 ? remainingTTL : 60 * 60 * 24;
      next();
    }
  });

}

export {tokenVerification , accessTokenVerification , refreshTokenVerification};
