import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        ...dto,
        deadline: new Date(dto.deadline),
        userId,
      },
    });
  }

  async findAll(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' },
    });
    return goals.map((g) => ({
      ...g,
      progress: Number(g.targetAmount) > 0
        ? Math.min(100, (Number(g.currentAmount) / Number(g.targetAmount)) * 100)
        : 0,
    }));
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    if (goal.userId !== userId) throw new ForbiddenException();
    return {
      ...goal,
      progress: Number(goal.targetAmount) > 0
        ? Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)
        : 0,
    };
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(userId, id);
    const data: any = { ...dto };
    if (dto.deadline) data.deadline = new Date(dto.deadline);
    return this.prisma.goal.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.goal.delete({ where: { id } });
  }
}
