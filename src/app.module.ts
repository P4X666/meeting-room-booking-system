import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { Role } from './user/entities/role.entity';
import { Permission } from './user/entities/permission.entity';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { LoginGuard } from './auth/login.guard';
import { PermissionGuard } from './auth/permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory(configService: ConfigService) {
        // 获取当前环境
        const nodeEnv = configService.get('NODE_ENV');
        const isProduction = nodeEnv === 'production';

        return {
          type: 'mysql',
          host: configService.get('MYSQL_HOST'),
          port: Number(configService.get('MYSQL_PORT')),
          username: configService.get('MYSQL_USER'),
          password: configService.get('MYSQL_PASSWORD'),
          database: configService.get('MYSQL_DATABASE'),
          synchronize: configService.get('MYSQL_SYNCHRONIZE') === 'true',
          logging: !isProduction, // 正式环境关闭日志
          entities: [User, Role, Permission],
          poolSize: Number(configService.get('MYSQL_POOL_SIZE')),
          extra: {
            auth: {
              authPlugin: 'sha256_passwords',
            },
          },
          // 处理无效的 WHERE 条件值 - 环境差异化配置
          invalidWhereValuesBehavior: {
            // 正式环境：忽略 undefined 值，避免因参数缺失导致服务崩溃
            // 非正式环境：抛出错误，帮助及时发现和修复代码问题
            undefined: isProduction ? 'ignore' : 'throw',
            // null 值在所有环境都应该抛出错误，这是有效的数据异常
            null: 'throw',
          },
        };
      },
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory(configService: ConfigService) {
        return {
          secret: configService.get('jwt_secret'),
          signOptions: {
            expiresIn: configService.get('jwt_access_token_expires_time'), // 默认 30 分钟
          },
          refreshSignOptions: {
            expiresIn: configService.get('jwt_refresh_token_expires_time'), // 默认 7 天
          },
        };
      },
      inject: [ConfigService],
    }),

    UserModule,
    RedisModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: LoginGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
