'use client'
import React from 'react'
import { supabase } from '@/lib/supabase'

interface Profe {
  id: string
  nombre: string
  slug: string
  deporte: string
  email: string
  telefono: string
  activo: boolean
  created_at: string
}

export default function AdminPage() {
  const [autenticado, setAutenticado] = React.useState(false)
  const [passInput, setPassInput] = React.useState('')
  const [errorPass, setErrorPass] = React.useState('')
  const [profes, setProfes] = React.useState<Profe[]>([])
  const [loading, setLoading] = React.useState(false)
  const [accionando, setAccionando] = React.useState<string | null>(null)
  const [filtro, setFiltro] = React.useState<'todos' | 'pendientes' | 'activos'>('pendientes')

  function handleLogin() {
    if (passInput === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAutenticado(true)
      cargarProfes()
    } else {
      setErrorPass('Contraseña incorrecta.')
    }
  }

  async function cargarProfes() {
    setLoading(true)
    const { data } = await supabase
      .from('cf_profes')
      .select('*')
      .order('created_at', { ascending: false })
    setProfes(data || [])
    setLoading(false)
  }

  async function activar(profeId: string) {
    setAccionando(profeId)
    await supabase.from('cf_profes').update({ activo: true }).eq('id', profeId)
    await cargarProfes()
    setAccionando(null)
  }

  async function desactivar(profeId: string) {
    if (!confirm('¿Desactivar este profe? No podrá ingresar al sistema.')) return
    setAccionando(profeId)
    await supabase.from('cf_profes').update({ activo: false }).eq('id', profeId)
    await cargarProfes()
    setAccionando(null)
  }

  async function eliminar(profeId: string, nombre: string) {
    if (!confirm('¿Eliminar a ' + nombre + '? Esta acción no se puede deshacer.')) return
    setAccionando(profeId)
    const { error } = await supabase.from('cf_profes').delete().eq('id', profeId)
    if (error) {
      console.error('Error eliminar:', JSON.stringify(error))
      alert('Error: ' + error.message + ' / código: ' + error.code)
    }
    await cargarProfes()
    setAccionando(null)
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function linkWABienvenida(profe: Profe) {
    if (!profe.telefono) return null
    const msg = 'Hola ' + profe.nombre + ', te confirmamos que tu cuenta en CoachFlow ya está activa! Entrá con tu usuario "' + profe.slug + '" en coachflow-xi.vercel.app 🎉'
    return 'https://wa.me/54' + profe.telefono + '?text=' + encodeURIComponent(msg)
  }

  const profesFiltrados = profes.filter(p => {
    if (filtro === 'pendientes') return !p.activo
    if (filtro === 'activos') return p.activo
    return true
  })

  const pendientes = profes.filter(p => !p.activo).length
  const activos = profes.filter(p => p.activo).length

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">CoachFlow</h1>
            <p className="text-zinc-500 text-sm mt-1">Panel de administración</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Contraseña admin</label>
              <input type="password" placeholder="••••••••" value={passInput}
                onChange={e => setPassInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
            </div>
            {errorPass && <p className="text-red-400 text-sm">{errorPass}</p>}
            <button onClick={handleLogin}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg text-sm transition-colors">
              Entrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-violet-400 font-bold text-lg">CoachFlow</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 text-sm">Admin</span>
        </div>
        <button onClick={() => setAutenticado(false)}
          className="text-zinc-600 hover:text-red-400 text-sm transition-colors">
          Salir
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Panel de administración</h1>
          <p className="text-zinc-500 text-sm mt-1">{profes.length} profes en total</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1">Total registrados</p>
            <p className="text-2xl font-semibold text-white">{profes.length}</p>
          </div>
          <div className={`rounded-xl p-4 border ${pendientes > 0 ? 'bg-yellow-950/30 border-yellow-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
            <p className="text-zinc-500 text-xs mb-1">Pendientes de activar</p>
            <p className={`text-2xl font-semibold ${pendientes > 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>{pendientes}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1">Activos (clientes)</p>
            <p className="text-2xl font-semibold text-green-400">{activos}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          {(['pendientes', 'activos', 'todos'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtro === f ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              {f === 'pendientes' ? 'Pendientes' + (pendientes > 0 ? ' (' + pendientes + ')' : '') : f === 'activos' ? 'Activos' : 'Todos'}
            </button>
          ))}
          <button onClick={cargarProfes}
            className="ml-auto px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white bg-zinc-800 transition-colors">
            ↻ Actualizar
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-zinc-500 text-sm">Cargando...</p>
        ) : profesFiltrados.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">
              {filtro === 'pendientes' ? 'No hay profes pendientes de activación.' : 'No hay profes en esta categoría.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {profesFiltrados.map(p => (
              <div key={p.id} className={`bg-zinc-900 border rounded-xl p-4 ${!p.activo ? 'border-yellow-900/40' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white">{p.nombre}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                        {p.activo ? 'Activo' : 'Pendiente'}
                      </span>
                      {p.deporte && (
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{p.deporte}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>@{p.slug}</span>
                      {p.email && <span>{p.email}</span>}
                      {p.telefono && <span>📱 {p.telefono}</span>}
                      <span>Registrado: {formatFecha(p.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-wrap justify-end">
                    {!p.activo ? (
                      <button onClick={() => activar(p.id)} disabled={accionando === p.id}
                        className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium">
                        {accionando === p.id ? '...' : '✓ Activar'}
                      </button>
                    ) : (
                      <button onClick={() => desactivar(p.id)} disabled={accionando === p.id}
                        className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        {accionando === p.id ? '...' : 'Desactivar'}
                      </button>
                    )}
                    {linkWABienvenida(p) && (
                      <a href={linkWABienvenida(p)!} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-green-900/40 text-green-400 hover:bg-green-900/60 px-3 py-1.5 rounded-lg transition-colors">
                        WA bienvenida
                      </a>
                    )}
                    <button onClick={() => eliminar(p.id, p.nombre)} disabled={accionando === p.id}
                      className="text-xs text-red-500 hover:text-red-400 px-2 py-1.5 rounded border border-zinc-700 hover:border-red-800 transition-colors disabled:opacity-50">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
