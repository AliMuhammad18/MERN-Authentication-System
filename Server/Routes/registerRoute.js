import express from 'express';
import validator from '../config/validator.js'
import register from '../Controllers/userAuth.js';

const authRouter = express.Router();

authRouter.post("/register" , validator , register);

export default authRouter;
