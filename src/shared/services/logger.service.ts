import { Injectable, Logger, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger extends Logger {
  error(message: string, trace: string, context?: string) {
    // Add custom error handling/monitoring here
    super.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    // Add custom warning handling here
    super.warn(message, context);
  }

  log(message: string, context?: string) {
    // Add custom info logging here
    super.log(message, context);
  }
} 