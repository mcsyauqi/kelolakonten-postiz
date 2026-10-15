import {
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class ActivateDto {
  @IsString()
  @IsDefined()
  @IsEmail()
  email: string;

  @IsString()
  @IsDefined()
  @Length(6, 6)
  code: string;

  @IsString()
  @IsOptional()
  datafast_visitor_id?: string;
}
