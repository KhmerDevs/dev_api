import { Injectable, ConsoleLogger, Scope } from '@nestjs/common';
import * as winston from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger extends ConsoleLogger {
  private readonly winstonLogger: winston.Logger;

  constructor() {
    super();
    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.winstonLogger.add(
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      );
    }
  }

  error(message: string, trace?: string, context?: string) {
    this.winstonLogger.error({
      message,
      trace,
      context,
      timestamp: new Date().toISOString(),
    });
    super.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    this.winstonLogger.warn({
      message,
      context,
      timestamp: new Date().toISOString(),
    });
    super.warn(message, context);
  }

  log(message: string, context?: string) {
    this.winstonLogger.info({
      message,
      context,
      timestamp: new Date().toISOString(),
    });
    super.log(message, context);
  }

  debug(message: string, context?: string) {
    this.winstonLogger.debug({
      message,
      context,
      timestamp: new Date().toISOString(),
    });
    super.debug(message, context);
  }

  verbose(message: string, context?: string) {
    this.winstonLogger.verbose({
      message,
      context,
      timestamp: new Date().toISOString(),
    });
    super.verbose(message, context);
  }
}
