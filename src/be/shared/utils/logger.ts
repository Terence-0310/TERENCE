import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Common log configuration for Pino
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: isDev ? undefined : { env: process.env.NODE_ENV },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});
