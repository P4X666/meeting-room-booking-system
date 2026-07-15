

export class UserListQueryDto {
  pageNo?: number = 1;
  pageSize?: number = 10;
  username?: string;
  nickName?: string;
  email?: string;
}