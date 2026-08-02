import nodemailer from 'nodemailer';
import 'dotenv/config';
import logger from 'logger.js';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.verify()
logger.info("SMTP Connection Verified");

export default transporter;
