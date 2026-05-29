import express from 'express';
import validator from '../config/validator.js'
import {register , continueWithGoogle} from "../Controllers/userAuth.js";
import passport from 'passport'

const authRouter = express.Router();

authRouter.post("/register" , validator , register);

authRouter.get("/debug",(req,res)=>{
    res.send("hello");
})

authRouter.get("/auth/google",
    passport.authenticate('google', {
        scope : ['profile' , 'email'],
        session : false
}));

authRouter.get("/auth/google/callback",
 passport.authenticate('google' , {
    session : false
 }),
 continueWithGoogle
);

export default authRouter;
