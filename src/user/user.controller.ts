import {
  Body,
  Controller,
  Get,
  UnauthorizedException,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { EmailService } from 'src/email/email.service';
import { RedisService } from 'src/redis/redis.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RemoveUserDto } from './dto/remove-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { generateAccessToken } from '@/utils/user';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
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
      return {
        access_token,
        refresh_token,
      };
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

      return {
        access_token,
        refresh_token,
      };
    } catch {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }
}
