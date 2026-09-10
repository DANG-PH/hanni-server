import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Giới hạn route theo role, dùng chung với RolesGuard: `@Roles('admin')`. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
