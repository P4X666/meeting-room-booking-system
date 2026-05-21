import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  transporter: Transporter;
  mailFromName: string;
  mailFromAddress: string;

  constructor(private configService: ConfigService) {
    this.transporter = createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.qq.com'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: this.configService.get<boolean>('MAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('MAIL_USER') || '',
        pass: this.configService.get<string>('MAIL_PASS') || '',
      },
    });
    this.mailFromName =
      this.configService.get<string>('MAIL_FROM_NAME') || '会议室预定系统';
    this.mailFromAddress =
      this.configService.get<string>('MAIL_FROM_ADDRESS') || '';
  }

  async sendMail({ to, subject, html }) {
    await this.transporter.sendMail({
      from: {
        name: this.mailFromName,
        address: this.mailFromAddress,
      },
      to,
      subject,
      html,
    });
  }
}
