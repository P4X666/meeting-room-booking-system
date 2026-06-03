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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory(configService: ConfigService) {
        return {
          type: 'mysql',
          host: configService.get('MYSQL_HOST'),
          port: Number(configService.get('MYSQL_PORT')),
          username: configService.get('MYSQL_USER'),
          password: configService.get('MYSQL_PASSWORD'),
          database: configService.get('MYSQL_DATABASE'),
          synchronize: configService.get('MYSQL_SYNCHRONIZE') === 'true',
          logging: true,
          entities: [User, Role, Permission],
          poolSize: Number(configService.get('MYSQL_POOL_SIZE')),
          extra: {
            auth: {
              authPlugin: 'sha256_passwords',
            },
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
  ],
})
export class AppModule {}
