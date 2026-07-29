import { UPDATE_PASSWORD_CAPTCHA_KEY, UPDATE_USER_CAPTCHA_KEY } from '@/constant/user';
import { RequireLogin, UserInfo } from '@/decorator';
import { EmailService } from '@/email/email.service';
import { RedisService } from '@/redis/redis.service';
import { storage } from '@/utils/file-storage';
import { generateAccessToken, getPermissions } from '@/utils/user';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';
import path from 'path';
import { FreezeUserDto } from './dto/freeze-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RemoveUserDto } from './dto/remove-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { LoginUserVo } from './vo/login-user.vo';
import { RefreshTokenVo } from './vo/refresh-token.vo';
import { UserDetailVo } from './vo/user-info.vo';
import { UserListVo } from './vo/user-list.vo';

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
  @HttpCode(HttpStatus.OK)
  async userLogin(@Body() loginUser: LoginUserDto) {
    const user = await this.userService.login(loginUser, false);
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
    const { access_token, refresh_token } = generateAccessToken(
      userVo.userInfo,
      this.configService,
      this.jwtService,
    );
    userVo.accessToken = access_token;
    userVo.refreshToken = refresh_token;
    return userVo;
  }

  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const user = await this.userService.login(loginUser, true);
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
    const { access_token, refresh_token } = generateAccessToken(
      userVo.userInfo,
      this.configService,
      this.jwtService,
    );
    userVo.accessToken = access_token;
    userVo.refreshToken = refresh_token;
    return userVo;
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

  @Patch(['update_password', 'admin/update_password'])
  async updatePassword(@Body() passwordDto: UpdateUserPasswordDto) {
    return await this.userService.updatePassword(passwordDto);
  }

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
  @RequireLogin()
  @Get('update/captcha')
  async updateCaptcha(@UserInfo('email') email: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`${UPDATE_USER_CAPTCHA_KEY}${email}`, code, 10 * 60);

    await this.emailService.sendMail({
      to: email,
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
  @RequireLogin()
  async freeze(@Body() body: FreezeUserDto) {
    await this.userService.freezeUserById(body.id);
    return 'success';
  }

  @Get('list')
  async list(@Query() query: UserListQueryDto) {
    const { pageNo = 1, pageSize = 10, username = '', nickName = '', email = '' } = query;
    const vo = await this.userService.findUsersByPage(pageNo, pageSize, username, nickName, email);
    const userListVo = new UserListVo();
    userListVo.list = vo.users;
    userListVo.totalCount = vo.totalCount;
    return userListVo;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    dest: 'uploads',
    storage,
    limits: {
      fileSize: 1024 * 1024 * 5,
    },
    fileFilter(req, file, callback) {
      const extname = path.extname(file.originalname);
      if (['.jpg', '.jpeg', '.png', '.gif'].includes(extname)) {
        callback(null, true);
      } else {
        callback(new BadRequestException('Only jpg, jpeg, png, gif files allowed'), false);
      }
    },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return path.join(file.destination, file.filename).split(path.sep).join('/');
  }

}
