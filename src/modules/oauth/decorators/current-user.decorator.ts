import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator
 * 
 * Extracts the current authenticated user from the request.
 * Must be used with @UseGuards(JwtAuthGuard)
 * 
 * @example
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@CurrentUser() user) {
 *   return user;
 * }
 * 
 * @example Get specific property
 * @Get('me')
 * @UseGuards(JwtAuthGuard)
 * async getMe(@CurrentUser('id') userId: number) {
 *   return { userId };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return just that property
    return data ? user?.[data] : user;
  },
);

