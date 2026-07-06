import jwt from 'jsonwebtoken';

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

export {tokenVerification , accessTokenVerification};
