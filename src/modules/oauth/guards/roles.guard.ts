import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user-management/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard - Role-Based Access Control Guard
 * 
 * Features:
 * - Checks if user has required role(s) for endpoint
 * - Admin users can bypass all role restrictions
 * - Supports multiple roles per endpoint
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN, UserRole.LSM)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // ✨ ADMIN BYPASS: Admins can access everything
    if (user.role === 'admin' || user.role === UserRole.ADMIN) {
      return true;
    }

    // Map Prisma enum values to TypeScript enum for comparison
    const userRoleEnum = this.mapPrismaRoleToEnum(user.role);

    // Check if user has any of the required roles
    return requiredRoles.some((role) => role === userRoleEnum);
  }

  /**
   * Map Prisma Role enum to TypeScript UserRole enum
   * Prisma: 'customer', 'service_provider', 'local_service_manager', 'admin'
   * TypeScript: CUSTOMER, PROVIDER, LSM, ADMIN
   */
  private mapPrismaRoleToEnum(prismaRole: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      'customer': UserRole.CUSTOMER,
      'service_provider': UserRole.PROVIDER,
      'local_service_manager': UserRole.LSM,
      'admin': UserRole.ADMIN,
    };

    return roleMap[prismaRole] || prismaRole as UserRole;
  }
}