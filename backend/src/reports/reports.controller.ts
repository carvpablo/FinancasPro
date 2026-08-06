import { Controller, Get, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Dados mensais para gráficos' })
  @ApiQuery({ name: 'year', required: false, example: 2024 })
  getMonthly(@Request() req: any, @Query('year') year?: string) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.service.getMonthlyData(req.user.id, y);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Exportar Excel do mês' })
  @ApiQuery({ name: 'month', example: '2024-01' })
  async exportExcel(@Request() req: any, @Query('month') month: string, @Res() res: Response) {
    const m = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const buffer = await this.service.exportExcel(req.user.id, m);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="financas-${m}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Exportar PDF do mês' })
  @ApiQuery({ name: 'month', example: '2024-01' })
  async exportPdf(@Request() req: any, @Query('month') month: string, @Res() res: Response) {
    const m = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const buffer = await this.service.exportPdf(req.user.id, m);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="financas-${m}.pdf"`,
    });
    res.send(buffer);
  }
}
