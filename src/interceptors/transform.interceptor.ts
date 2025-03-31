import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

export interface Response<T> {
  data: T;
  metadata: {
    timestamp: string;
    path: string;
    status: number;
    version: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map(data => ({
        data: instanceToPlain(data) as T,
        metadata: {
          timestamp: new Date().toISOString(),
          path: request.url,
          status: response.statusCode || HttpStatus.OK,
          version: process.env.API_VERSION || '1.0'
        }
      })),
    );
  }
} 