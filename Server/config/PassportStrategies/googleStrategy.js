import passport from "passport";
import 'dotenv/config';
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../../Models/userModel.js";
import {sendContinueWithGoogleEmail} from "../../utils/emailService.js";

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
              googleId : profile.id               
             });
          }

       }

        await sendContinueWithGoogleEmail(primaryEmail , profile.displayName);

      done(null , user);  
    }
    catch(err){
        done(err , null);
    }

  })

);

