import { LoginUserVo } from '@/user/vo/login-user.vo';

declare global {
  namespace Express {
    interface Request {
      user?: LoginUserVo;
    }
  }
}
