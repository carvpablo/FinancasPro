import { IsNumber, IsString, Min, Max } from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  categoryId: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsNumber()
  @Min(0.01)
  amount: number;
}
