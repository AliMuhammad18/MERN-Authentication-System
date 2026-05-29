import passport from "passport";
import 'dotenv/config';
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../../Models/userModel.js";
import transporter from "../transporter.js";

passport.use(
 
  new GoogleStrategy(   
   {
    clientID : process.env.GOOGLE_CLIENT_ID,
    clientSecret : process.env.GOOGLE_CLIENT_SECRET,
    callbackURL : process.env.GOOGLE_CALLBACK_URL
   },
   
   async function verify(accessToken , refreshToken , profile , done){
   
    try{
     let user = await userModel.findOne({googleId : profile.id}); 
     const primaryEmail = profile.emails?.[0]?.value;

       if(!user){
        
          user = await userModel.findOne({email : primaryEmail});

          if(user){
            user.googleId = profile.id;
            await user.save();
          }

          else{
            user = await userModel.create({
              name : profile.displayName,
              email : primaryEmail,    
              googleId : profile.id               
             });
          }

       }

       const mailOptions = {
         from: process.env.SENDER_EMAIL,
         to: primaryEmail,
         subject: "Continued with your Google account",
         text: `Welcome to Ali's Authentication System Your account has been created with email id: ${profile.emails[0].value}`
       };

      transporter.sendMail(mailOptions); 

      done(null , user);  
    }
    catch(err){
        done(err , null);
    }

  })

);

