import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, month: number, year: number) {
    // Busca todos os orçamentos do usuário para o mês
    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
    });

    // Para cada orçamento, calcula o gasto real do mês
    const result = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const agg = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        const spent = Number(agg._sum.amount ?? 0);
        const limit = Number(budget.amount);
        const percentage = limit > 0 ? Math.min((spent / limit) * 100, 999) : 0;

        return {
          id: budget.id,
          categoryId: budget.categoryId,
          category: budget.category,
          month: budget.month,
          year: budget.year,
          amount: limit,
          spent,
          percentage,
        };
      }),
    );

    return result;
  }

  async upsert(userId: string, dto: CreateBudgetDto) {
    return this.prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId: dto.categoryId,
          month: dto.month,
          year: dto.year,
        },
      },
      update: { amount: dto.amount },
      create: {
        userId,
        categoryId: dto.categoryId,
        month: dto.month,
        year: dto.year,
        amount: dto.amount,
      },
    });
  }

  async remove(userId: string, id: string) {
    return this.prisma.budget.deleteMany({ where: { id, userId } });
  }
}
