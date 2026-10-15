import {
  IsDefined,
  IsEmail,
  IsIn,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export class ForgotReturnPasswordDto {
  @IsString()
  @IsDefined()
  @IsEmail()
  email: string;

  @IsString()
  @IsDefined()
  @Length(6, 6)
  code: string;

  @IsString()
  @IsDefined()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsString()
  @IsDefined()
  @IsIn([makeId(10)], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.repeatPassword)
  repeatPassword: string;
}
