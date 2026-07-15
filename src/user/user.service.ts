import { UPDATE_PASSWORD_CAPTCHA_KEY, UPDATE_USER_CAPTCHA_KEY } from '@/constant/user';
import { getPermissions } from '@/utils/user';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { md5 } from 'src/utils';
import { Repository } from 'typeorm';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { LoginUserVo } from './vo/login-user.vo';

@Injectable()
export class UserService {
  private logger = new Logger();

  @InjectRepository(User)
  private userRepository: Repository<User>;
  @InjectRepository(Role)
  private roleRepository: Repository<Role>;
  @InjectRepository(Permission)
  private permissionRepository: Repository<Permission>;

  @Inject(RedisService)
  private redisService: RedisService;

  async register(user: RegisterUserDto) {
    const captcha = await this.redisService.get(`captcha_${user.email}`);

    if (!captcha) {
      throw new BadRequestException('验证码已失效');
    }

    if (user.captcha !== captcha) {
      throw new BadRequestException('验证码不正确');
    }

    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });

    if (foundUser) {
      throw new BadRequestException('用户已存在');
    }

    const newUser = new User();
    newUser.username = user.username;
    newUser.password = md5(user.password);
    newUser.email = user.email;
    newUser.nickName = user.nickName;

    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '注册失败';
    }
  }

  async initData() {
    const user1 = new User();
    user1.username = 'zhangsan';
    user1.password = md5('111111');
    user1.email = 'xxx@xx.com';
    user1.isAdmin = true;
    user1.nickName = '张三';
    user1.phoneNumber = '13233323333';

    const user2 = new User();
    user2.username = 'lisi';
    user2.password = md5('222222');
    user2.email = 'yy@yy.com';
    user2.nickName = '李四';

    const role1 = new Role();
    role1.name = '管理员';

    const role2 = new Role();
    role2.name = '普通用户';

    const permission1 = new Permission();
    permission1.code = 'ccc';
    permission1.description = '访问 ccc 接口';

    const permission2 = new Permission();
    permission2.code = 'ddd';
    permission2.description = '访问 ddd 接口';

    user1.roles = [role1];
    user2.roles = [role2];

    role1.permissions = [permission1, permission2];
    role2.permissions = [permission1];

    await this.permissionRepository.save([permission1, permission2]);
    await this.roleRepository.save([role1, role2]);
    await this.userRepository.save([user1, user2]);
  }

  async login(loginUserDto: LoginUserDto, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        username: loginUserDto.username,
        isAdmin,
      },
      relations: {
        roles: {
          permissions: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.password !== md5(loginUserDto.password)) {
      throw new BadRequestException('密码错误');
    }

    const userVo = new LoginUserVo();
    const permissions = getPermissions(user);
    userVo.userInfo = {
      id: user.id,
      username: user.username,
      nickName: user.nickName,
      email: user.email,
      headPic: user.headPic,
      phoneNumber: user.phoneNumber,
      isFrozen: user.isFrozen,
      isAdmin: user.isAdmin,
      createTime: user.createTime.getTime(),
      roles: user.roles.map((role) => role.name),
      permissions,
    };

    return userVo;
  }

  async removeUser(username: string, password: string) {
    const currentUser = await this.userRepository.findOne({
      where: {
        username,
        password: md5(password),
      },
      relations: {
        roles: true,
      },
    });
    if (!currentUser) {
      throw new NotFoundException('用户不存在');
    }
    // 硬删除（会自动级联删除 user_roles 记录）
    await this.userRepository.remove(currentUser);
    // 清理相关缓存
    await this.redisService.del(`captcha_${currentUser.email}`);
  }

  async findUserById(userId: number, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        isAdmin,
      },
      relations: {
        roles: {
          permissions: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const permissions = getPermissions(user);

    return {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      roles: user.roles.map((item) => item.name),
      permissions,
    };
  }
  /**
   * 获取用户详情
   * @param userId 用户ID
   */
  async findUserDetailById(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async updatePassword(userId: number, passwordDto: UpdateUserPasswordDto) {
    const captcha = await this.redisService.get(`${UPDATE_PASSWORD_CAPTCHA_KEY}${passwordDto.email}`);

    if (!captcha) {
      throw new BadRequestException('验证码已失效');
    }

    if (passwordDto.captcha !== captcha) {
      throw new BadRequestException('验证码不正确');
    }

    const foundUser = await this.userRepository.findOneBy({
      id: userId
    });

    if (!foundUser) {
      throw new NotFoundException('用户不存在');
    }

    foundUser.password = md5(passwordDto.password);

    try {
      await this.userRepository.save(foundUser);
      return '密码修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '密码修改失败';
    }
  }

  async update(userId: number, updateUserDto: UpdateUserDto) {
    const captcha = await this.redisService.get(`${UPDATE_USER_CAPTCHA_KEY}${updateUserDto.email}`);

    if (!captcha) {
      throw new BadRequestException('验证码已失效');
    }

    if (updateUserDto.captcha !== captcha) {
      throw new BadRequestException('验证码不正确');
    }

    const foundUser = await this.userRepository.findOneBy({
      id: userId
    });

    if (!foundUser) {
      throw new NotFoundException('用户不存在');
    }

    if (updateUserDto.nickName) {
      foundUser.nickName = updateUserDto.nickName;
    }
    if (updateUserDto.headPic) {
      foundUser.headPic = updateUserDto.headPic;
    }

    try {
      await this.userRepository.save(foundUser);
      return '用户信息修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '用户信息修改失败';
    }
  }
  /**
   * 冻结用户
   * @param id 用户ID
   */
  async freezeUserById(id: number) {
    const user = await this.userRepository.findOneBy({
      id
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    user.isFrozen = true;
    await this.userRepository.save(user);
  }

  async findUsersByPage(pageNo: number, pageSize: number, username?: string, nickName?: string, email?: string) {
    const skipCount = (pageNo - 1) * pageSize;

    const condition: Record<string, any> = {};
    if (username) {
      condition.username = username;
    }
    if (nickName) {
      condition.nickName = nickName;
    }
    if (email) {
      condition.email = email;
    }

    const [users, totalCount] = await this.userRepository.findAndCount({
      select: {
        id: true,
        username: true,
        nickName: true,
        email: true,
        phoneNumber: true,
        isFrozen: true,
        headPic: true,
        createTime: true,
      },
      skip: skipCount,
      take: pageSize,
      where: condition,
    });

    return {
      users,
      totalCount
    }
  }


}
