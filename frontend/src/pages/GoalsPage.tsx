import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Target, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Goal {
  id: string; title: string; description?: string; targetAmount: string;
  currentAmount: string; deadline: string; color: string; progress: number;
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#22c55e','#f59e0b','#06b6d4','#f97316'];

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  targetAmount: z.number().min(1, 'Valor mínimo R$ 1,00'),
  currentAmount: z.number().min(0, 'Valor não pode ser negativo'),
  deadline: z.string().min(1, 'Prazo obrigatório'),
  color: z.string(),
});
type FormData = z.infer<typeof schema>;

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1', currentAmount: 0 },
  });
  const watchedColor = watch('color');

  const { data: goals = [], isLoading: loading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => api.get('/goals').then(r => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['goals'] });

  const openCreate = () => { setEditing(null); reset({ color: '#6366f1', currentAmount: 0 }); setShowModal(true); };
  const openEdit = (g: Goal) => {
    setEditing(g);
    reset({
      title: g.title, description: g.description,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      deadline: format(new Date(g.deadline), 'yyyy-MM-dd'),
      color: g.color,
    });
    setShowModal(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editing) await api.put(`/goals/${editing.id}`, data);
    else await api.post('/goals', data);
    setShowModal(false);
    invalidate();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover meta?')) return;
    await api.delete(`/goals/${id}`);
    invalidate();
  };


  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Metas de Economia</h1>
          <p className="page-subtitle">Defina e acompanhe seus objetivos financeiros</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="btn-new-goal">
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Target size={48} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
          <p className="text-muted">Nenhuma meta criada ainda</p>
          <button className="btn btn-primary mt-4" onClick={openCreate}>Criar primeira meta</button>
        </div>
      ) : (
        <div className="grid-2">
          {goals.map((g) => {
            const deadline = new Date(g.deadline);
            const daysLeft = differenceInDays(deadline, new Date());
            const completed = g.progress >= 100;
            const expired = isPast(deadline) && !completed;

            return (
              <div key={g.id} className="card" style={{ position: 'relative', borderColor: completed ? 'rgba(34,197,94,0.3)' : 'var(--color-border)' }}>
                {completed && (
                  <div style={{ position: 'absolute', top: 16, right: 16 }}>
                    <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: g.color + '22', border: `1px solid ${g.color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Target size={18} style={{ color: g.color }} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700 }}>{g.title}</h3>
                      {g.description && <p className="text-xs text-muted">{g.description}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(g)}><Pencil size={13} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(g.id)}><Trash2 size={13} /></button>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: g.color }}>{fmt(Number(g.currentAmount))}</span>
                    <span className="text-muted text-sm">{fmt(Number(g.targetAmount))}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${g.progress}%`,
                      background: completed ? '#22c55e' : g.color,
                    }} />
                  </div>
                  <div style={{ textAlign: 'right', marginTop: 4, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {g.progress.toFixed(0)}%
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} style={{ color: 'var(--color-text-subtle)' }} />
                  <span className={`text-xs ${expired ? 'text-danger' : 'text-muted'}`}>
                    {completed ? 'Concluída! 🎉' : expired ? 'Prazo expirado' : `${daysLeft} dias restantes`}
                    {' · '}{format(deadline, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Editar' : 'Nova'} Meta</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Título</label>
                <input {...register('title')} className="form-input" placeholder="Ex: Viagem Europa" id="goal-title" />
                {errors.title && <span className="form-error">{errors.title.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Descrição (opcional)</label>
                <input {...register('description')} className="form-input" placeholder="Detalhes da meta" id="goal-desc" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Valor Alvo (R$)</label>
                  <input {...register('targetAmount', { valueAsNumber: true })} type="number" step="0.01" className="form-input" placeholder="10000" id="goal-target" />
                  {errors.targetAmount && <span className="form-error">{errors.targetAmount.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Economizado (R$)</label>
                  <input {...register('currentAmount', { valueAsNumber: true })} type="number" step="0.01" className="form-input" placeholder="0" id="goal-current" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Prazo</label>
                <input {...register('deadline')} type="date" className="form-input" id="goal-deadline" />
                {errors.deadline && <span className="form-error">{errors.deadline.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Cor</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setValue('color', color)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: color, border: 'none',
                        cursor: 'pointer', outline: watchedColor === color ? `3px solid ${color}` : 'none',
                        outlineOffset: 2, transform: watchedColor === color ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="btn-save-goal">
                  {isSubmitting && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  {editing ? 'Salvar' : 'Criar'}
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
