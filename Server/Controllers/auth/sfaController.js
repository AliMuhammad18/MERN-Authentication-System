import userModel from "../../Models/userModel.js";
import transporter from "../../config/transporter.js";
import bcrypt from "bcrypt";
import {signAndSendAccessToken , signAndSendTempToken} from "../../utils/signAndSendJwt.js";

const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "missing fields" });
  }

  try {
    const userExists = await userModel.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const user = await userModel.create({ name, email, password });

    signAndSendAccessToken(user , res);

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "signupation Greetings !!",
      text: `Welcome to Ali's Authentication System Your account has been created with email id: ${email}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true , message : "user signed up successfully"});
  } catch (err) {
    console.error("error from signup controller",err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const continueWithGoogle = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    if(user.mfaEnabled){
      signAndSendTempToken(user, res);
      return res.status(200).json({success : true , message : "2FA is required"});
    }

    signAndSendAccessToken(user, res);

    res.status(200).json({ success: true , message : "user logged in successfully"});
  } catch (err) {
    console.error("error from continue with google controller",err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
 
const {email , password} = req.body;

 if(!email || !password){
  return res.status(400).json({success : false , message : "missing fields"});    
 }

 try{
  const user = await userModel.findOne({email});
 
  if(!user){
    return res.status(404).json({success : false , message : "user doesn't exists"});
  }

  const passwordCheck = await bcrypt.compare(password , user.password);

  if(!passwordCheck){
   return res.status(400).json({success : false , message : "Invalid Password"});
  }

  if(user.mfaEnabled){
      signAndSendTempToken(user, res);
      return res.status(200).json({success : true , message : "2FA is required"});
  }

  signAndSendAccessToken(user , res);

 res.status(200).json({ success: true , message : "user logged in successfully"});

}
catch(err){
  console.error("error from login controller",err);
  return res.status(500).json({success : false , message : err.message});
}
};

export { signup, continueWithGoogle , login};
