import { UPDATE_PASSWORD_CAPTCHA_KEY, UPDATE_USER_CAPTCHA_KEY } from '@/constant/user';
import { RequireLogin, UserInfo } from '@/decorator';
import { EmailService } from '@/email/email.service';
import { RedisService } from '@/redis/redis.service';
import { generateAccessToken } from '@/utils/user';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FreezeUserDto } from './dto/freeze-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RemoveUserDto } from './dto/remove-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { RefreshTokenVo } from './vo/refresh-token.vo';
import { UserDetailVo } from './vo/user-info.vo';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('register')
  async register(@Body() registerUser: RegisterUserDto) {
    return await this.userService.register(registerUser);
  }
  @Inject(EmailService)
  private emailService: EmailService;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  @Get('register-captcha')
  async captcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`captcha_${address}`, code, 5 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '注册验证码',
      html: `<p>你的注册验证码是 ${code}</p>`,
    });
    return '发送成功';
  }

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }

  @Post('login')
  async userLogin(@Body() loginUser: LoginUserDto) {
    const user = await this.userService.login(loginUser, false);
    const { access_token, refresh_token } = generateAccessToken(
      user.userInfo,
      this.configService,
      this.jwtService,
    );
    user.accessToken = access_token;
    user.refreshToken = refresh_token;
    return user;
  }

  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const user = await this.userService.login(loginUser, true);
    const { access_token, refresh_token } = generateAccessToken(
      user.userInfo,
      this.configService,
      this.jwtService,
    );
    user.accessToken = access_token;
    user.refreshToken = refresh_token;
    return user;
  }
  @ApiBearerAuth()
  @Post('remove')
  async deleteUser(@Body() deleteUserDto: RemoveUserDto) {
    await this.userService.removeUser(
      deleteUserDto.username,
      deleteUserDto.password,
    );
    return '删除成功';
  }
  @Get('refresh')
  async refresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify<{ userId: User['id'] }>(refreshToken);

      const user = await this.userService.findUserById(data.userId, false);
      const { access_token, refresh_token } = generateAccessToken(
        user,
        this.configService,
        this.jwtService,
      );
      const vo = new RefreshTokenVo();

      vo.access_token = access_token;
      vo.refresh_token = refresh_token;
      return vo;

    } catch {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }
  @Get('admin/refresh')
  async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify<{ userId: User['id'] }>(refreshToken);

      const user = await this.userService.findUserById(data.userId, true);

      const { access_token, refresh_token } = generateAccessToken(
        user,
        this.configService,
        this.jwtService,
      );

      const vo = new RefreshTokenVo();

      vo.access_token = access_token;
      vo.refresh_token = refresh_token;
      return vo;
    } catch {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  @ApiBearerAuth()
  @Get('info')
  @RequireLogin()
  async info(@UserInfo('userId') userId: number) {
    const user = await this.userService.findUserDetailById(userId);
    const userVo = new UserDetailVo();
    userVo.id = user.id;
    userVo.username = user.username;
    userVo.nickName = user.nickName;
    userVo.email = user.email;
    userVo.headPic = user.headPic;
    userVo.phoneNumber = user.phoneNumber;
    userVo.isFrozen = user.isFrozen;
    userVo.createTime = user.createTime;

    return userVo;
  }

  @ApiBearerAuth()
  @Post(['update_password', 'admin/update_password'])
  @RequireLogin()
  async updatePassword(@UserInfo('userId') userId: number, @Body() passwordDto: UpdateUserPasswordDto) {
    return await this.userService.updatePassword(userId, passwordDto);
  }

  @ApiBearerAuth()
  @Get('update_password/captcha')
  async updatePasswordCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`${UPDATE_PASSWORD_CAPTCHA_KEY}${address}`, code, 10 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '更改密码验证码',
      html: `<p>你的更改密码验证码是 ${code}</p>`
    });
    return '发送成功';
  }

  @ApiBearerAuth()
  @Post(['update', 'admin/update'])
  @RequireLogin()
  async update(@UserInfo('userId') userId: number, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(userId, updateUserDto);
  }

  @ApiBearerAuth()
  @Get('update/captcha')
  async updateCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`${UPDATE_USER_CAPTCHA_KEY}${address}`, code, 10 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '更改用户信息验证码',
      html: `<p>你的验证码是 ${code}</p>`
    });
    return '发送成功';
  }
  /**
   * 冻结用户
   */
  @ApiBearerAuth()
  @Post('freeze')
  async freeze(@Body() body: FreezeUserDto) {
    await this.userService.freezeUserById(body.id);
    return 'success';
  }

  @ApiBearerAuth()
  @Get('list')
  async list(@Query() query: UserListQueryDto) {
    const { pageNo = 1, pageSize = 10, username = '', nickName = '', email = '' } = query;
    return await this.userService.findUsersByPage(pageNo, pageSize, username, nickName, email);
  }

}
