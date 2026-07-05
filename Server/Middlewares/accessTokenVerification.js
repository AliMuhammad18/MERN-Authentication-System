import jwt from 'jsonwebtoken';

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

export default accessTokenVerification;     