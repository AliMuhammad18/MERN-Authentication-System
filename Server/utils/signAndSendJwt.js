import jwt from "jsonwebtoken";

const signAndSendAccessToken = (user , res) => {
   const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const signAndSendTempToken = (user , res) => {
    const tempToken = jwt.sign({id : user._id} , process.env.TEMP_TOKEN_SECRET , {
        expiresIn : "5m"
      });
      
      res.cookie("temp_token" , tempToken , {
        httpOnly : true,
        secure : process.env.NODE_ENV === "production",
        sameSite : process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge : 5 * 60 * 1000,
      });
}

export{signAndSendAccessToken , signAndSendTempToken};