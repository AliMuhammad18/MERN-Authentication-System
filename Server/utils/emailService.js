import { BrevoClient } from "@getbrevo/brevo";
import 'dotenv/config';
import logger from '../config/logger.js';

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

logger.info("Brevo Client Initialized");

const sendContinueWithGoogleEmail = async (email , name) => {

 await brevo.transactionalEmails.sendTransacEmail({
  sender: {email: process.env.SENDER_EMAIL , name : "Ali Auth"},
  to: [{email: email , name : name}],
  subject: "Google Sign-In Successful",
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2>Welcome!</h2>

      <p>Hello ${name},</p>

      <p>You have successfully signed in using your Google account.</p>

      <p>If this was you, no further action is required.</p>

      <p>If you do not recognize this sign-in, please secure your Google account immediately.</p>

      <hr>

      <small>This is an automated email from Ali Auth.</small>
    </div>
  `,
});

}


const sendSignupOtpEmail = async(email , otp) => {

 await brevo.transactionalEmails.sendTransacEmail({
  sender: {email: process.env.SENDER_EMAIL , name : "Ali Auth"},
  to: [{email: email}],
  subject: "Verify Your Email Address",
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">

      <h2>Email Verification</h2>

      <p>Thank you for creating an account.</p>

      <p>Please use the following verification code:</p>

      <div
        style="
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          text-align:center;
          margin:30px 0;
        ">
        ${otp}
      </div>

      <p>This code expires in <strong>10 minutes</strong>.</p>

      <p>If you didn't request this account, you can safely ignore this email.</p>

      <hr>

      <small>Ali Auth</small>

    </div>
  `,
});

}

const sendPasswordResetOtpEmail = async(email , otp) => {

await brevo.transactionalEmails.sendTransacEmail({
  sender: {email: process.env.SENDER_EMAIL , name : "Ali Auth"},
  to: [{email: email}],
  subject: "Password Reset Request",
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">

      <h2>Reset Your Password</h2>

      <p>We received a request to reset your password.</p>

      <p>Your password reset code is:</p>

      <div
        style="
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          text-align:center;
          margin:30px 0;
        ">
        ${otp}
      </div>

      <p>This code expires in <strong>10 minutes</strong>.</p>

      <p>If you didn't request a password reset, simply ignore this email.</p>

      <hr>

      <small>Ali Auth</small>

    </div>
  `,
});

}

const sendLoginNotificationEmail = async(email , name) => {

await brevo.transactionalEmails.sendTransacEmail({
  sender: {email: process.env.SENDER_EMAIL , name : "Ali Auth"},
  to: [{email: email , name : name}],
  subject: "New Login to Your Account",
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">

      <h2>Login Successful</h2>

      <p>Hello ${name},</p>

      <p>You have successfully signed in to your account.</p>

      <p>If this was you, no action is needed.</p>

      <p>If you do not recognize this login, we recommend changing your password immediately.</p>

      <hr>

      <small>Ali Auth</small>

    </div>
  `,
});
}

export {sendContinueWithGoogleEmail , sendSignupOtpEmail , sendPasswordResetOtpEmail , sendLoginNotificationEmail};