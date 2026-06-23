import express from 'express';
import validator from '../Middlewares/validator.js'
import {register , continueWithGoogle , login} from "../Controllers/userAuth.js";
import passport from 'passport'

const authRouter = express.Router();

authRouter.post("/register" , validator , register);
authRouter.post("/login" , login);
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
