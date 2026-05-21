import {body , validationResult} from 'express-validator';

const validator = [
  body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ characters'),
  body('name').trim().notEmpty().withMessage('Username is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next(); 
  }
];

export default validator;