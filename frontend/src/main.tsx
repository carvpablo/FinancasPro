import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutos em cache sem refetch
      gcTime: 10 * 60 * 1000,     // 10 minutos antes de remover do cache
      refetchOnMount: false,       // não refetch ao remontar (ex: trocar de página)
      refetchOnWindowFocus: false, // não refetch ao voltar para a aba/página
      refetchOnReconnect: false,   // não refetch ao reconectar à internet
      retry: 1,
    },
  },
})

// 🔍 DIAGNÓSTICO: logar TODA vez que uma query faz fetch e o motivo
queryClient.getQueryCache().subscribe((event) => {
  const key = JSON.stringify(event.query.queryKey)
  const action = (event as any).action
  if (action?.type === 'fetch') {
    console.log(`%c[RQ FETCH] ${key}`, 'color: orange; font-weight: bold')
    console.log('  → observers:', event.query.getObserversCount())
    console.log('  → isStale:', event.query.isStale())
    console.log('  → dataUpdatedAt:', event.query.state.dataUpdatedAt ? new Date(event.query.state.dataUpdatedAt).toISOString() : 'nunca')
    console.trace('  → stack trace:')
  }
  if (action?.type === 'invalidate') {
    console.log(`%c[RQ INVALIDATE] ${key}`, 'color: yellow; font-weight: bold')
  }
})

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
