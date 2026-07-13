import redisClient from "../config/redisClient.js";

export const rateLimiting = (limit, duration) => {
  return async (req, res, next) => {
    const key = `rate_limit:${req.method}${req.route.path}${req.ip}`;
    
    const requests = await redisClient.incr(key);

    if(requests === 1){
        await redisClient.expire(key, duration);
    }

    if (requests > limit) {
      return res.status(429).json({ message: "Too many requests" });
    }

    next();
  };
};
