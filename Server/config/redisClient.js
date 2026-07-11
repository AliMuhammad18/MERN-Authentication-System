import {createClient} from "redis";

const redisClient = createClient({
  url: process.env.production == 'true' ? process.env.INTERNAL_REDIS_URL : process.env.EXTERNAL_REDIS_URL ,
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnecting... Attempt #${retries}`);
      return Math.min(retries * 100, 3000); 
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected Successfully'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis initialization:', err);
  }
})();

export default redisClient;
