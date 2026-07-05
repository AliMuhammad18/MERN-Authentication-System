import crypto from 'crypto';
import bcrypt from 'bcrypt';

const generateBackupCodes = () => {
 let codes = [];

 for(let i = 0 ; i < 10 ; i++){ 
  let code = crypto.randomBytes(5).toString('hex').toUpperCase();
  codes.push(code);
 }

 return codes;

}

const saveBackupCodes = async (user , codes) => {
  for(let code of codes){
    const hash = await bcrypt.hash(code , 10);
    user.backupCodes.push({
        code : hash,
        used : false,
        usedAt : null,
    });
  }

  await user.save();
}

const verifyBackupCode = async (user , code) => {

    for(let entry of user.backupCodes){
        const isMatch = await bcrypt.compare(code , entry.code);
        
        if(isMatch && !entry.used){
           entry.used = true;
           entry.usedAt = new Date();
           await user.save();
           return true;
        }
    }

    return false;
}

export {generateBackupCodes , saveBackupCodes , verifyBackupCode};