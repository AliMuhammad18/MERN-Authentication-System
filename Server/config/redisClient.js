import {createClient} from "redis";
import logger from './logger.js';

const redisClient = createClient({
  url: process.env.production ? process.env.INTERNAL_REDIS_URL : process.env.EXTERNAL_REDIS_URL ,
  socket: {
    reconnectStrategy: (retries) => {
      logger.warn(`Redis reconnecting... Attempt #${retries}`);
      return Math.min(retries * 100, 3000); 
    }
  }
});

redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
redisClient.on('connect', () => logger.info('Redis Client Connected Successfully'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis initialization:', err);
  }
})();

export default redisClient;
