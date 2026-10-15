import {
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export class ChangePasswordDto {
  // required by the service when the account already has a password
  @IsString()
  @IsOptional()
  currentPassword?: string;

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
