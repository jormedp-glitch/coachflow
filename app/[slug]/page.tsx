'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Alumno {
  id: string
  nombre: string
  telefono: string
  estado: string
  objetivo: string
}

interface Turno {
  id: string
  alumno_id: string
  espacio: string
  fecha_hora: string
  estado: string
}

export default function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [profeNombre, setProfeNombre] = React.useState('')
  const [alumnos, setAlumnos] = React.useState<Alumno[]>([])
  const [turnos, setTurnos] = React.useState<Turno[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const nombre = localStorage.getItem('cf_profe_nombre')
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) {
      router.push('/')
      return
    }
    setProfeNombre(nombre || '')
    cargarDatos()
  }, [slug])

  async function cargarDatos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return

    const { data: alumnosData } = await supabase
      .from('cf_alumnos')
      .select('*')
      .eq('profe_id', profeId)
      .eq('estado', 'activo')

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    const { data: turnosData } = await supabase
      .from('cf_turnos')
      .select('*')
      .eq('profe_id', profeId)
      .gte('fecha_hora', hoy.toISOString())
      .lt('fecha_hora', manana.toISOString())
      .order('fecha_hora', { ascending: true })

    setAlumnos(alumnosData || [])
    setTurnos(turnosData || [])
    setLoading(false)
  }

  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-400">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-violet-400 font-bold text-lg">CoachFlow</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-300 text-sm">{profeNombre}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={() => router.push(`/${slug}/alumnos`)} className="text-zinc-400 hover:text-white transition-colors">Alumnos</button>
          <button onClick={() => router.push(`/${slug}/rutinas`)} className="text-zinc-400 hover:text-white transition-colors">Rutinas</button>
          <button onClick={() => router.push(`/${slug}/turnos`)} className="text-zinc-400 hover:text-white transition-colors">Turnos</button>
          <button onClick={() => { localStorage.clear(); router.push('/') }} className="text-zinc-600 hover:text-red-400 transition-colors">Salir</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Panel de control</h1>
          <p className="text-zinc-500 text-sm mt-1 capitalize">{hoy}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1">Alumnos activos</p>
            <p className="text-3xl font-semibold text-white">{alumnos.length}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1">Turnos hoy</p>
            <p className="text-3xl font-semibold text-violet-400">{turnos.length}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1">Tu link de acceso</p>
            <p className="text-xs text-violet-400 truncate">coachflow/{slug}</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-300">Turnos de hoy</h2>
            <button onClick={() => router.push(`/${slug}/turnos`)} className="text-xs text-violet-400 hover:text-violet-300">Ver todos →</button>
          </div>
          {turnos.length === 0 ? (
            <p className="text-zinc-600 text-sm">Sin turnos para hoy</p>
          ) : (
            <div className="space-y-3">
              {turnos.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-sm text-white">{t.espacio}</p>
                    <p className="text-xs text-zinc-500">{new Date(t.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">{t.estado}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => router.push(`/${slug}/turnos`)} className="mt-4 w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors">
            + Nuevo turno
          </button>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-300">Alumnos recientes</h2>
            <button onClick={() => router.push(`/${slug}/alumnos`)} className="text-xs text-violet-400 hover:text-violet-300">Ver todos →</button>
          </div>
          {alumnos.length === 0 ? (
            <p className="text-zinc-600 text-sm">Sin alumnos todavía</p>
          ) : (
            <div className="space-y-2">
              {alumnos.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-900 flex items-center justify-center text-xs font-medium text-violet-300">
                      {a.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white">{a.nombre}</p>
                      <p className="text-xs text-zinc-500">{a.objetivo || 'Sin objetivo definido'}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-400">activo</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => router.push(`/${slug}/alumnos`)} className="mt-4 w-full py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-sm text-zinc-400 hover:text-white transition-colors">
            + Nuevo alumno
          </button>
        </div>

      </div>
    </div>
  )
}