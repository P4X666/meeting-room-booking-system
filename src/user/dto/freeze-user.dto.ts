import { IsNotEmpty, IsNumber } from "class-validator";


export class FreezeUserDto {
    @IsNotEmpty({
        message: '用户ID不能为空',
    })
    @IsNumber(
        {
            allowNaN: false,
            allowInfinity: false,
            maxDecimalPlaces: 0,
        },
        {
            message: '用户ID必须是数字',
        }
    )
    id: number;
}
