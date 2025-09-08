// ESM logger compatible Node 22
import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;
const fmt = printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), fmt),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), fmt),
    }),
  ],
});

export default logger;
