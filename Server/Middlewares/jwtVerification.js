import jwt from 'jsonwebtoken';

const jwtVerification = async (req , res , next) => {
     
      const authHeader = req.headers['Authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if(!token){
         return res.status(401).json({success : false , message : "Access denied token not found"});        
      }

       jwt.verify(token , process.env.JWT_SECRET , (err , decoded) => {
            if(err){
                return res.status(401).json({success : false , message : "Token verification failed"});
            }
            else{
                req.id = decoded;
                next();
            }
        });
}   

export default jwtVerification;
