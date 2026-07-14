import { Permission } from '@/user/entities/permission.entity';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        roles: string[];
        permissions: Permission[];
      };
    }
  }
}
