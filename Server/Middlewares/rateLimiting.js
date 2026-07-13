import redisClient from "../config/redisClient.js";

export const rateLimiting = (limit, duration) => {
  return async (req, res, next) => {
    const key = `rate_limit:${req.ip}`;

    if(!await redisClient.exists(key)){
         await redisClient.expire(key, duration);
    }

    const requests = await redisClient.incr(key);
    if (requests > limit) {
      return res.status(429).json({ message: "Too many requests" });
    }

    next();
  };
};
