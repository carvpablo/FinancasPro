import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @ApiProperty({ example: 'Fundo de emergência' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  targetAmount: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  currentAmount?: number;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  deadline: string;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateGoalDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  targetAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  currentAmount?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;
}
