import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { ImportService, ParsedTransaction } from './transactions.import.service';
import { CreateTransactionDto, UpdateTransactionDto, FilterTransactionDto } from './dto/transaction.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private service: TransactionsService,
    private importService: ImportService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar transação' })
  create(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar transações com filtros' })
  findAll(@Request() req: any, @Query() filters: FilterTransactionDto) {
    return this.service.findAll(req.user.id, filters);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.id, id);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  // ─── Import ──────────────────────────────────────────────────────────────

  @Post('import/parse')
  @ApiOperation({ summary: 'Parsear arquivo CSV/OFX e retornar prévia' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  parseImport(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.importService.parse(file.originalname, file.buffer);
  }

  @Post('import/confirm')
  @ApiOperation({ summary: 'Salvar transações importadas em lote' })
  async confirmImport(
    @Request() req: any,
    @Body() body: { transactions: Array<ParsedTransaction & { categoryId: string }> },
  ) {
    const results = await Promise.allSettled(
      body.transactions.map((t) =>
        this.service.create(req.user.id, {
          title: t.title,
          amount: t.amount,
          type: t.type,
          date: t.date,
          categoryId: t.categoryId,
        }),
      ),
    );
    const saved = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { saved, failed };
  }
}
