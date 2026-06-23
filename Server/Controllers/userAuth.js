import userModel from "../Models/userModel.js";
import transporter from "../config/transporter.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "missing fields" });
  }

  try {
    const userExists = await userModel.findOne({ email });

    if (userExists) {
      return res.json({ success: false, message: "User already exists" });
    }

    const user = await userModel.create({ name, email, password });
    await user.save();
    //console.log("user created");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    //console.log("jwt signed");

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Registeration Greetings !!",
      text: `Welcome to Ali's Authentication System Your account has been created with email id: ${email}`,
    };

    await transporter.sendMail(mailOptions);
    //console.log("email sent")

    return res.status(200).json({ success: true , message : "user registered successfully"});
  } catch (err) {
    console.error("error from register controller",err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const continueWithGoogle = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true , message : "user logged in successfully"});
  } catch (err) {
    console.error("error from continue with google controller",err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
 
  const {email , password} = req.body;
  console.log("email from login", email);
  console.log("password from login", password);

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

const token = jwt.sign({id : user._id} , process.env.JWT_SECRET , {
  expiresIn : "7d"
});

res.cookie("token" , token , {
  httpOnly : true,
  secure : process.env.NODE_ENV === "production",
  sameSite : process.env.NODE_ENV === "production" ? "none" : "strict",
  maxAge : 7 * 24 * 60 * 60 * 1000,
});

return res.status(200).json({success : true , message : "user logged in successfully"});

}
catch(err){
  console.error("error from login controller",err);
  return res.status(500).json({success : false , message : err.message});
}
};
export { register, continueWithGoogle , login};
