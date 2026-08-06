import {
  Controller, Get, Post, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/budget.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.budgetsService.findAll(
      req.user.id,
      Number(month) || now.getMonth() + 1,
      Number(year) || now.getFullYear(),
    );
  }

  @Post()
  upsert(@Req() req: any, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.upsert(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.budgetsService.remove(req.user.id, id);
  }
}
