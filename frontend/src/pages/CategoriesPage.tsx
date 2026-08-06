import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Tag, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Category { id: string; name: string; color: string; icon: string; _count?: { transactions: number }; }

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#ef4444','#f97316','#f59e0b','#22c55e','#10b981','#06b6d4','#3b82f6'];

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  color: z.string(),
  icon: z.string(),
});
type FormData = z.infer<typeof schema>;

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [showModal, setShowModal] = useState(() => !!(location.state as any)?.openModal);
  const [editing, setEditing] = useState<Category | null>(null);

  // Clear navigation state so refresh doesn't reopen the modal
  useEffect(() => {
    if ((location.state as any)?.openModal) {
      window.history.replaceState({}, '');
    }
  }, []);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1', icon: 'tag', name: '' },
  });

  const watchedColor = watch('color');

  const { data: categories = [], isLoading: loading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const openCreate = () => {
    setEditing(null);
    reset({ color: '#6366f1', icon: 'tag', name: '' });
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    reset({ name: c.name, color: c.color, icon: c.icon });
    setShowModal(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editing) await api.put(`/categories/${editing.id}`, data);
    else await api.post('/categories', data);
    setShowModal(false);
    invalidate();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover categoria?')) return;
    await api.delete(`/categories/${id}`);
    invalidate();
  };


  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">Organize suas transações por categoria</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="btn-new-category">
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : categories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Tag size={48} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
          <p className="text-muted">Nenhuma categoria criada ainda</p>
          <button className="btn btn-primary mt-4" onClick={openCreate}>Criar primeira categoria</button>
        </div>
      ) : (
        <div className="grid-3">
          {categories.map((c) => (
            <div key={c.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: c.color }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: c.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${c.color}44`,
                  }}>
                    <Tag size={18} style={{ color: c.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div className="text-xs text-muted">
                      {c._count?.transactions ?? 0} transações
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)} title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)} title="Excluir">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Editar' : 'Nova'} Categoria</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input {...register('name')} className="form-input" placeholder="Ex: Alimentação" id="cat-name" />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Cor</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setValue('color', color)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: color, border: 'none',
                        cursor: 'pointer', outline: watchedColor === color ? `3px solid ${color}` : 'none',
                        outlineOffset: 2, transform: watchedColor === color ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: watchedColor }} />
                  <input {...register('color')} className="form-input" style={{ width: 100, fontSize: '0.8rem' }} id="cat-color" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="btn-save-cat">
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
