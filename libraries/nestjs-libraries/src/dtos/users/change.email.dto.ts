import {
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class ChangeEmailStartDto {
  @IsString()
  @IsDefined()
  @IsEmail()
  email: string;

  // required by the service when the account already has a password
  @IsString()
  @IsOptional()
  password?: string;
}

export class ChangeEmailConfirmDto {
  @IsString()
  @IsDefined()
  @Length(6, 6)
  oldCode: string;

  @IsString()
  @IsDefined()
  @Length(6, 6)
  newCode: string;
}
