'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Alumno {
  id: string
  nombre: string
  telefono: string
  email: string
  objetivo: string
  notas: string
  estado: string
  codigo_acceso: string
}

export default function AlumnosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [alumnos, setAlumnos] = React.useState<Alumno[]>([])
  const [loading, setLoading] = React.useState(true)
  const [mostrarForm, setMostrarForm] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [form, setForm] = React.useState({
    nombre: '', telefono: '', email: '', objetivo: '', notas: ''
  })

  React.useEffect(() => {
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) { router.push('/'); return }
    cargarAlumnos()
  }, [slug])

  async function cargarAlumnos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return
    const { data } = await supabase
      .from('cf_alumnos')
      .select('*')
      .eq('profe_id', profeId)
      .order('created_at', { ascending: false })
    setAlumnos(data || [])
    setLoading(false)
  }

  function generarCodigo() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  async function guardarAlumno() {
    if (!form.nombre.trim()) return
    setGuardando(true)
    const profeId = localStorage.getItem('cf_profe_id')
    const { error } = await supabase.from('cf_alumnos').insert({
      profe_id: profeId,
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      objetivo: form.objetivo.trim(),
      notas: form.notas.trim(),
      codigo_acceso: generarCodigo(),
      estado: 'activo'
    })
    if (!error) {
      setForm({ nombre: '', telefono: '', email: '', objetivo: '', notas: '' })
      setMostrarForm(false)
      cargarAlumnos()
    }
    setGuardando(false)
  }

  function linkAlumno(codigo: string) {
    return window.location.origin + '/alumno/' + codigo
  }

  function copiarLink(codigo: string) {
    navigator.clipboard.writeText(linkAlumno(codigo))
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-400">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/' + slug)} className="text-violet-400 font-bold text-lg">CoachFlow</button>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 text-sm">Alumnos</span>
        </div>
        <button onClick={() => router.push('/' + slug)} className="text-zinc-500 hover:text-white text-sm transition-colors">← Volver</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Alumnos</h1>
            <p className="text-zinc-500 text-sm mt-1">{alumnos.length} en total</p>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo alumno
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">Nuevo alumno</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
                  placeholder="Juan Perez"
                />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Telefono / WhatsApp</label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
                  placeholder="3815123456"
                />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
                  placeholder="juan@email.com"
                />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Objetivo</label>
                <input
                  type="text"
                  value={form.objetivo}
                  onChange={e => setForm({ ...form, objetivo: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
                  placeholder="Bajar de peso, ganar masa..."
                />
              </div>
            </div>
            <div>
              <label className="text-zinc-500 text-xs mb-1 block">Notas internas</label>
              <textarea
                value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
                rows={2}
                placeholder="Lesiones, preferencias, observaciones..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={guardarAlumno}
                disabled={guardando}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar alumno'}
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {alumnos.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-zinc-500 text-sm">Todavia no tenes alumnos. Agrega el primero!</p>
            </div>
          ) : (
            alumnos.map(a => (
              <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-900 flex items-center justify-center text-sm font-medium text-violet-300">
                    {a.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{a.nombre}</p>
                    <p className="text-xs text-zinc-500">{a.objetivo || 'Sin objetivo'} · {a.telefono || 'Sin telefono'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${a.estado === 'activo' ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {a.estado}
                  </span>
                  <button
                    onClick={() => copiarLink(a.codigo_acceso)}
                    className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    Copiar link
                  </button>
                  {a.telefono && (
                    <a
                      href={'https://wa.me/54' + a.telefono + '?text=Hola ' + a.nombre + ', te mando tu link de CoachFlow: ' + linkAlumno(a.codigo_acceso)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
                    >
                      WA
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}