import express from 'express';
import {accessTokenVerification , tokenVerification , refreshTokenVerification} from '../Middlewares/jwtVerification.js';
import { rateLimiting } from "../Middlewares/rateLimiting.js";
import {passwordValidator , emailValidator , nameValidator} from '../Middlewares/validators.js'
import {sendSignupOtp , verifySignupOtp , finishSignup, continueWithGoogle , login , logout , refreshAccessToken , sendPasswordResetOtp , verifyPasswordResetOtp , resetPassword, getMe} from "../Controllers/auth/sfaController.js";
import {enableMfa , verifyMfa , loginWithBackupCode , verifyBackupCodeToDisableMfa, verifyOtpToDisableMfa } from "../Controllers/auth/mfaController.js";
import passport from 'passport'

const authRouter = express.Router();

//SFA routes
authRouter.post("/send-signup-otp" ,  rateLimiting(10, 60 * 10)  , emailValidator , sendSignupOtp);
authRouter.post("/verify-signup-otp" ,  rateLimiting(10, 60 * 10) , verifySignupOtp);
authRouter.post("/finish-signup" ,  rateLimiting(10, 60 * 10) , nameValidator , passwordValidator , finishSignup);
authRouter.post("/login" , rateLimiting(10, 60 * 10) , emailValidator , passwordValidator , login);
authRouter.get("/me" , rateLimiting(30, 60 * 10), accessTokenVerification , getMe);
authRouter.post("/logout" , rateLimiting(10, 60 * 10), accessTokenVerification , logout);
authRouter.post("/refresh" , rateLimiting(10, 60 * 10), refreshTokenVerification , refreshAccessToken);
authRouter.post("/send-password-reset-otp" , rateLimiting(10, 60 * 10) , emailValidator , sendPasswordResetOtp);
authRouter.post("/verify-password-reset-otp" , rateLimiting(10, 60 * 10) , verifyPasswordResetOtp);
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
authRouter.post("/verify-2fa" , rateLimiting(10, 60 * 10), tokenVerification , verifyMfa);
authRouter.post("/login-with-backup-code" , rateLimiting(10, 60 * 10), tokenVerification , loginWithBackupCode);
authRouter.post("/verify-disable-backup-code" , rateLimiting(10, 60 * 10), accessTokenVerification , verifyBackupCodeToDisableMfa);
authRouter.post("/verify-disable-otp" , rateLimiting(10, 60 * 10), accessTokenVerification , verifyOtpToDisableMfa);

export default authRouter; 
