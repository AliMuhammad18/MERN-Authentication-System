import userModel from "../Models/userModel.js";
import transporter from "../config/transoporter.js";
import jwt from 'jsonwebtoken';
import { promisify } from 'node:util';

const register = async (req , res) => {
  
  const {name , email , password} = req.body;

  if(!name || !email || !password){
     return res.json({success : false , message : "missing fields"});
  }
  
  
  try{
 
    const userExists = await userModel.findOne({email});

    if(userExists){
     return res.json({success : false , message : "User already exists"});
    }

    const user = await userModel.create({name , email  , password});
    await user.save();
    //console.log("user created");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {expiresIn: "7d"});
               

    //console.log("jwt signed");

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Registeration Greetings !!",
      text: `Welcome to Ali's Authentication System Your account has been created with email id: ${email}`
    };

    res.cookie('token' , token , {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    await transporter.sendMail(mailOptions);
    //console.log("email sent")
   
    return res.json({ success: true });
  
  }
  catch(err){
    return res.json({ success: false, message: err });
  }
};


export default register;