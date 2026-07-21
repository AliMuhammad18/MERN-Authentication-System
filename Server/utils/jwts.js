import jwt from "jsonwebtoken";
import redisClient from "../config/redisClient.js";
import crypto from 'crypto'

const signAndSendAccessToken = (user , res) => {
   const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m",
    });

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:"strict",
      maxAge: 15 * 60 * 1000,
    });
};

const signAndSendRefreshToken = async (user , res , familyId , ttl) => {
   
    const jti = crypto.randomUUID();

    let value = {
      userId : user._id,
      createdAt : Date.now(),
      familyId : familyId
    };

    await redisClient.setEx(`Refresh:${jti}` , ttl , JSON.stringify(value));
    await redisClient.setEx(`FamilyId:${familyId}` , ttl , JSON.stringify({jti : jti}));

    // ttl is in seconds; JWT expiresIn also accepts seconds as a number
    const refreshToken = jwt.sign({ id: user._id , jti : jti , familyId : familyId}, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: ttl,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: ttl * 1000, // cookie maxAge is in milliseconds
    });
};

const refreshTokenRevocation = async (familyId) => {
   const rawData = await redisClient.get(`FamilyId:${familyId}`);
   const tokenData = rawData ? JSON.parse(rawData) : null;
   
   if(!tokenData){
    return;
   }

   const jti = tokenData.jti;
   await redisClient.unlink(`Refresh:${jti}`);
   await redisClient.unlink(`FamilyId:${familyId}`);
}

const signAndSendTempToken = (user , res) => {
    const tempToken = jwt.sign({id : user._id} , process.env.TEMP_TOKEN_SECRET , {
        expiresIn : "5m"
      });
      
      res.cookie("temp_token" , tempToken , {
        httpOnly : true,
        secure : process.env.NODE_ENV === "production",
        sameSite : "strict",
        maxAge : 5 * 60 * 1000,
      });
}

export{signAndSendAccessToken , signAndSendTempToken , signAndSendRefreshToken , refreshTokenRevocation};

