import nodemailer from 'nodemailer';
import 'dotenv/config';
import logger from './logger.js';

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true, 
  auth: {
    user: "resend",
    pass: process.env.RESEND_SMTP_API_KEY,
  },
});

await transporter.verify()
logger.info("SMTP Connection Verified");

export default transporter;
