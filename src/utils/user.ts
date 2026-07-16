import { Permission } from '@/user/entities/permission.entity';
import { User } from '@/user/entities/user.entity';
import type { UserService } from '@/user/user.service';
import { BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export const generateAccessToken = (
  userInfo: Awaited<ReturnType<UserService['findUserById']>>,
  configService: ConfigService,
  jwtService: JwtService,
) => {
  const access_token = jwtService.sign(
    {
      userId: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      roles: userInfo.roles,
      permissions: userInfo.permissions,
    },
    {
      expiresIn: configService.get('jwt_access_token_expires_time'),
    },
  );

  const refresh_token = jwtService.sign(
    {
      userId: userInfo.id,
    },
    {
      expiresIn: configService.get('jwt_refresh_token_expires_time'),
    },
  );

  return {
    access_token,
    refresh_token,
  };
};

// 一个用户可能拥有多个角色，而不同角色可能包含 相同的权限 。例如：
//   - 管理员角色 ：拥有权限 A、B、C
//   - 编辑者角色 ：拥有权限 A、D
export const getPermissions = (user: User) => {
  const permissionMap = new Map<string, Permission>();
  user.roles.forEach((role) => {
    role.permissions.forEach((permission) => {
      permissionMap.set(permission.code, permission);
    });
  });
  return Array.from(permissionMap.values());
};

export function generateParseIntPipe(name: unknown) {
    return new ParseIntPipe({
      exceptionFactory() {
        throw new BadRequestException(name + ' 应该传数字');
      } 
    })
}
