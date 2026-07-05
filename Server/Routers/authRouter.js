import express from 'express';
import tokenVerification from '../Middlewares/tokenVerification.js';
import accessTokenVerification from '../Middlewares/accessTokenVerification.js';
import validator from '../Middlewares/validator.js'
import {signup , continueWithGoogle , login} from "../Controllers/auth/sfaController.js";
import {enableMfa , verifyMfa , disableMfa , loginWithBackupCode , verifyBackupCodeToDisableMfa, verifyOtpToDisableMfa } from "../Controllers/auth/mfaController.js";
import passport from 'passport'

const authRouter = express.Router();

authRouter.post("/signup" , validator , signup);
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

authRouter.post("/enable-2fa" , accessTokenVerification , enableMfa);
authRouter.post("/verify-2fa" , tokenVerification , verifyMfa);
authRouter.post("/login-with-backup-code" , tokenVerification , loginWithBackupCode);
authRouter.post("/disable-2fa" , accessTokenVerification , disableMfa);
authRouter.post("/verify-disable-backup-code" , accessTokenVerification , verifyBackupCodeToDisableMfa);
authRouter.post("/verify-disable-otp" , accessTokenVerification , verifyOtpToDisableMfa);

export default authRouter; 
