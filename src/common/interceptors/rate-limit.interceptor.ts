import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private store: RateLimitStore = {};
  private readonly MAX_REQUESTS = 50; // Max requests per window
  private readonly WINDOW_MS = 60 * 1000; // 1 minute window

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip; // Use user ID or IP
    const key = `rate_limit_${userId}`;

    const now = Date.now();
    const userLimit = this.store[key];

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize
      this.store[key] = {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      };
    } else if (userLimit.count >= this.MAX_REQUESTS) {
      // Rate limit exceeded
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please wait a moment before trying again.',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } else {
      // Increment count
      userLimit.count++;
    }

    // Clean up old entries every 100 requests
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return next.handle();
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}
