import { IsInt } from "class-validator";


export class UserListQueryDto {
  @IsInt()
  pageNo?: number = 1;
  @IsInt()
  pageSize?: number = 10;
  username?: string;
  nickName?: string;
  email?: string;
}