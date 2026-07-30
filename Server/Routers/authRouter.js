import express from 'express';
import {accessTokenVerification , tokenVerification , refreshTokenVerification} from '../Middlewares/jwtVerification.js';
import { rateLimitingByIp , rateLimitingByEmail } from "../Middlewares/rateLimiting.js";
import {passwordValidator , emailValidator , nameValidator} from '../Middlewares/validators.js'
import {sendSignupOtp , verifySignupOtp , finishSignup, continueWithGoogle , login , logout , refreshAccessToken , sendPasswordResetOtp , verifyPasswordResetOtp , resetPassword, getMe} from "../Controllers/auth/sfaController.js";
import {enableMfa , verifyMfa , loginWithBackupCode , verifyBackupCodeToDisableMfa, verifyOtpToDisableMfa } from "../Controllers/auth/mfaController.js";
import passport from 'passport'

const authRouter = express.Router();

//SFA routes
authRouter.post("/send-signup-otp" ,  rateLimitingByIp(10, 60 * 10) , rateLimitingByEmail(10, 60 * 10), emailValidator , sendSignupOtp); // limit by ip and email
authRouter.post("/verify-signup-otp" ,  rateLimitingByIp(10, 60 * 10) , verifySignupOtp); // limit by ip
authRouter.post("/finish-signup" ,  rateLimitingByIp(10, 60 * 10) , nameValidator , passwordValidator , finishSignup); // limit by ip
authRouter.post("/login" , rateLimitingByEmail(10, 60 * 10) , emailValidator , passwordValidator , login); // limit by email
authRouter.get("/me" , rateLimitingByIp(30, 60 * 10), accessTokenVerification , getMe); // limit by ip
authRouter.post("/logout" , rateLimitingByIp(10, 60 * 10), accessTokenVerification , logout); // limit by ip
authRouter.post("/refresh" , rateLimitingByIp(10, 60 * 10), refreshTokenVerification , refreshAccessToken); // limit by ip
authRouter.post("/send-password-reset-otp" , rateLimitingByEmail(10, 60 * 10) , emailValidator , sendPasswordResetOtp); // limit by email
authRouter.post("/verify-password-reset-otp" , rateLimitingByIp(10, 60 * 10) , verifyPasswordResetOtp); // limit by ip
authRouter.post("/reset-password" , rateLimitingByIp(10, 60 * 10) , passwordValidator , resetPassword); // limit by ip

//google authentication routes
authRouter.get("/auth/google", rateLimitingByIp(10, 60 * 10),
    passport.authenticate('google', {
        scope : ['profile' , 'email'], // limit by ip
        session : false
}));

authRouter.get("/auth/google/callback", rateLimitingByIp(10, 60 * 10), //limit by ip
 passport.authenticate('google' , {
    session : false
 }),
 continueWithGoogle
);

//2FA routes
authRouter.post("/enable-2fa" , rateLimitingByIp(10, 60 * 10), accessTokenVerification , enableMfa);
authRouter.post("/verify-2fa" , rateLimitingByIp(10, 60 * 10), tokenVerification , verifyMfa);
authRouter.post("/login-with-backup-code" , rateLimitingByIp(10, 60 * 10), tokenVerification , loginWithBackupCode);
authRouter.post("/verify-disable-backup-code" , rateLimitingByIp(10, 60 * 10), accessTokenVerification , verifyBackupCodeToDisableMfa);
authRouter.post("/verify-disable-otp" , rateLimitingByIp(10, 60 * 10), accessTokenVerification , verifyOtpToDisableMfa);

export default authRouter; 
