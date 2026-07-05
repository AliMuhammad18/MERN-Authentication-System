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

export default tokenVerification;
