import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, FilterTransactionDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        ...dto,
        amount: dto.amount,
        date: new Date(dto.date),
        userId,
      },
      include: { category: true },
    });
  }

  async findAll(userId: string, filters: FilterTransactionDto) {
    const where: any = { userId };

    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' };

    if (filters.month) {
      const [year, month] = filters.month.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const income = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    return { transactions, summary: { income, expense, balance: income - expense } };
  }

  async findOne(userId: string, id: string) {
    const t = await this.prisma.transaction.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!t) throw new NotFoundException('Transação não encontrada');
    if (t.userId !== userId) throw new ForbiddenException();
    return t;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);
    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.transaction.update({ where: { id }, data, include: { category: true } });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.transaction.delete({ where: { id } });
  }
}
