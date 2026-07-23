const timestamp = () => new Date().toISOString();

const logger = {
  info:  (...args) => console.log(`${timestamp()} [INFO]`, ...args),
  warn:  (...args) => console.warn(`${timestamp()} [WARN]`, ...args),
  error: (...args) => console.error(`${timestamp()} [ERROR]`, ...args),
  security: (...args) => console.warn(`${timestamp()} [SECURITY]`, ...args),
};

export default logger;
