import express from 'express';
import {accessTokenVerification , tokenVerification} from '../Middlewares/jwtVerification.js';
import { rateLimiting } from "../Middlewares/rateLimiting.js";
import {passwordValidator , emailValidator , nameValidator} from '../Middlewares/validators.js'
import {signup , continueWithGoogle , login , logout , sendPasswordResetOtp , verifyPasswordResetOtp , resetPassword} from "../Controllers/auth/sfaController.js";
import {enableMfa , verifyMfa , disableMfa , loginWithBackupCode , verifyBackupCodeToDisableMfa, verifyOtpToDisableMfa } from "../Controllers/auth/mfaController.js";
import passport from 'passport'

const authRouter = express.Router();

//SFA routes
authRouter.post("/signup" ,  rateLimiting(5, 60 * 10) , passwordValidator , emailValidator , nameValidator , signup);
authRouter.post("/login" , rateLimiting(5, 60 * 10) , emailValidator , passwordValidator , login);
authRouter.post("/logout" , rateLimiting(5, 60 * 10), accessTokenVerification , logout);
authRouter.post("/send-password-reset-otp" , rateLimiting(10, 60 * 10) , emailValidator , sendPasswordResetOtp);
authRouter.post("/verify-password-reset-otp" , rateLimiting(5, 60 * 10) , verifyPasswordResetOtp);
authRouter.post("/reset-password" , rateLimiting(10, 60 * 10) , passwordValidator , resetPassword);

//google authentication routes
authRouter.get("/auth/google", rateLimiting(10, 60 * 10),
    passport.authenticate('google', {
        scope : ['profile' , 'email'],
        session : false
}));

authRouter.get("/auth/google/callback", rateLimiting(10, 60 * 10),
 passport.authenticate('google' , {
    session : false
 }),
 continueWithGoogle
);

//2FA routes
authRouter.post("/enable-2fa" , rateLimiting(10, 60 * 10), accessTokenVerification , enableMfa);
authRouter.post("/verify-2fa" , rateLimiting(5, 60 * 10), tokenVerification , verifyMfa);
authRouter.post("/login-with-backup-code" , rateLimiting(10, 60 * 10), tokenVerification , loginWithBackupCode);
authRouter.post("/disable-2fa" , rateLimiting(10, 60 * 10), accessTokenVerification , disableMfa);
authRouter.post("/verify-disable-backup-code" , rateLimiting(5, 60 * 10), accessTokenVerification , verifyBackupCodeToDisableMfa);
authRouter.post("/verify-disable-otp" , rateLimiting(10, 60 * 10), accessTokenVerification , verifyOtpToDisableMfa);

export default authRouter; 
