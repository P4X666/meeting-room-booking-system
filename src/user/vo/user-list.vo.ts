import { PickType } from "@nestjs/swagger";
import { User } from "../entities/user.entity";

class UserListItemVo extends PickType(User, [
  'id', 'username', 'nickName', 'email', 'isFrozen', 'phoneNumber', 'headPic', 'createTime'
] as const) {}

export class UserListVo {
    list: UserListItemVo[] = [];
    totalCount: number;
}