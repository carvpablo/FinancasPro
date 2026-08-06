import { useState } from 'react';
import { Plus, X, Trash2, Loader2, Gauge, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Category { id: string; name: string; color: string; icon: string; }

interface BudgetEntry {
  id: string;
  categoryId: string;
  category: Category;
  month: number;
  year: number;
  amount: number;
  spent: number;
  percentage: number;
}

const schema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  amount: z.number().min(0.01, 'Valor mínimo R$ 0,01'),
});
type FormData = z.infer<typeof schema>;

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getBarColor(pct: number) {
  if (pct >= 100) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  return '#22c55e';
}

function getStatusIcon(pct: number) {
  if (pct >= 100) return <AlertTriangle size={14} style={{ color: '#ef4444' }} />;
  if (pct >= 80) return <TrendingUp size={14} style={{ color: '#f59e0b' }} />;
  return <CheckCircle size={14} style={{ color: '#22c55e' }} />;
}

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export function BudgetsPage() {
  const now = new Date();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: undefined },
  });

  const { data: budgets = [], isLoading } = useQuery<BudgetEntry[]>({
    queryKey: ['budgets', month, year],
    queryFn: () => api.get(`/budgets?month=${month}&year=${year}`).then(r => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['budgets', month, year] });

  // Categories not yet budgeted this month
  const unbudgetedCategories = categories.filter(
    (c) => !budgets.some((b) => b.categoryId === c.id),
  );

  const onSubmit = async (data: FormData) => {
    await api.post('/budgets', { ...data, month, year });
    setShowModal(false);
    reset();
    invalidate();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover orçamento?')) return;
    await api.delete(`/budgets/${id}`);
    invalidate();
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = budgets.filter(b => b.percentage >= 100).length;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Controle seus gastos por categoria ao mês</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { reset(); setShowModal(true); }}
          disabled={unbudgetedCategories.length === 0}
          id="btn-new-budget"
        >
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      {/* Month Selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '12px 20px', width: 'fit-content',
      }}>
        <button className="btn btn-secondary btn-sm" onClick={prevMonth} id="btn-prev-month">‹</button>
        <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: 160, textAlign: 'center' }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={nextMonth} id="btn-next-month">›</button>
      </div>

      {/* Summary Cards */}
      {budgets.length > 0 && (
        <div className="grid-3" style={{ marginBottom: 32 }}>
          <div className="stat-card" style={{ '--accent-color': 'var(--color-primary)' } as React.CSSProperties}>
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Gauge size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="stat-value">{fmt(totalBudgeted)}</div>
            <div className="stat-label">Total Orçado</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': totalSpent > totalBudgeted ? '#ef4444' : '#22c55e' } as React.CSSProperties}>
            <div className="stat-icon" style={{ background: totalSpent > totalBudgeted ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)' }}>
              <TrendingUp size={20} style={{ color: totalSpent > totalBudgeted ? '#ef4444' : '#22c55e' }} />
            </div>
            <div className="stat-value" style={{ color: totalSpent > totalBudgeted ? '#ef4444' : 'var(--color-text)' }}>
              {fmt(totalSpent)}
            </div>
            <div className="stat-label">Total Gasto</div>
          </div>
          <div className="stat-card" style={{ '--accent-color': overBudgetCount > 0 ? '#ef4444' : '#22c55e' } as React.CSSProperties}>
            <div className="stat-icon" style={{ background: overBudgetCount > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)' }}>
              <AlertTriangle size={20} style={{ color: overBudgetCount > 0 ? '#ef4444' : '#22c55e' }} />
            </div>
            <div className="stat-value">{overBudgetCount}</div>
            <div className="stat-label">Acima do Limite</div>
          </div>
        </div>
      )}

      {/* Budget List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : budgets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Gauge size={48} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
          <p className="text-muted" style={{ marginBottom: 8 }}>Nenhum orçamento definido para {MONTHS[month - 1]}</p>
          <p className="text-xs text-subtle" style={{ marginBottom: 24 }}>
            Defina limites por categoria para controlar seus gastos
          </p>
          {categories.length > 0 && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Definir primeiro orçamento
            </button>
          )}
          {categories.length === 0 && (
            <p className="text-xs text-subtle">Crie categorias primeiro para definir orçamentos.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {budgets.map((b) => {
            const barColor = getBarColor(b.percentage);
            const remaining = b.amount - b.spent;
            return (
              <div key={b.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Color accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: b.category.color,
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 }}>
                  {/* Category info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: b.category.color + '22',
                      border: `1px solid ${b.category.color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>🏷️</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.category.name}</span>
                        {getStatusIcon(b.percentage)}
                        {b.percentage >= 100 && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: '#ef4444',
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
                            padding: '1px 7px', borderRadius: 999,
                          }}>EXCEDIDO</span>
                        )}
                        {b.percentage >= 80 && b.percentage < 100 && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b',
                            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)',
                            padding: '1px 7px', borderRadius: 999,
                          }}>ATENÇÃO</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(b.percentage, 100)}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Values row */}
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div>
                          <div className="text-xs text-subtle">Gasto</div>
                          <div style={{ fontWeight: 700, color: barColor, fontSize: '0.9rem' }}>{fmt(b.spent)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-subtle">Limite</div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fmt(b.amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-subtle">{remaining >= 0 ? 'Disponível' : 'Excedeu'}</div>
                          <div style={{
                            fontWeight: 700, fontSize: '0.9rem',
                            color: remaining >= 0 ? '#22c55e' : '#ef4444',
                          }}>
                            {fmt(Math.abs(remaining))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-subtle">Uso</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: barColor }}>
                            {b.percentage.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ flexShrink: 0, marginLeft: 12 }}
                    onClick={() => remove(b.id)}
                    title="Remover orçamento"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Orçamento</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>

            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              Definindo para <strong>{MONTHS[month - 1]} {year}</strong>
            </p>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select {...register('categoryId')} className="form-select" id="budget-category">
                  <option value="">Selecione...</option>
                  {unbudgetedCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <span className="form-error">{errors.categoryId.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Limite Mensal (R$)</label>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="Ex: 500,00"
                  id="budget-amount"
                />
                {errors.amount && <span className="form-error">{errors.amount.message}</span>}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="btn-save-budget">
                  {isSubmitting && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  Salvar Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
