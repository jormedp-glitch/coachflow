'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Turno {
  id: string
  alumno_id: string
  espacio: string
  fecha_hora: string
  estado: string
}

interface Alumno {
  id: string
  nombre: string
  telefono: string
}

const ESTADOS = ['pendiente', 'confirmado', 'completado', 'cancelado']
const ESTADO_COLORS: Record<string, string> = {
  pendiente:  'bg-yellow-900/40 text-yellow-400',
  confirmado: 'bg-blue-900/40 text-blue-400',
  completado: 'bg-green-900/40 text-green-400',
  cancelado:  'bg-red-900/40 text-red-400',
}

export default function TurnosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [turnos, setTurnos] = React.useState<Turno[]>([])
  const [alumnos, setAlumnos] = React.useState<Alumno[]>([])
  const [alumnosMap, setAlumnosMap] = React.useState<Record<string, Alumno>>({})
  const [loading, setLoading] = React.useState(true)
  const [mostrarForm, setMostrarForm] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [vista, setVista] = React.useState<'hoy' | 'semana' | 'todos'>('hoy')
  const [editandoTurno, setEditandoTurno] = React.useState<string | null>(null)
  const [formEdit, setFormEdit] = React.useState({ fecha: '', hora: '', espacio: '' })
  const [form, setForm] = React.useState({
    alumno_id: '', espacio: '',
    fecha: new Date().toISOString().split('T')[0], hora: '09:00',
  })

  React.useEffect(() => {
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) { router.push('/'); return }
    cargarDatos()
  }, [slug, vista])

  async function cargarDatos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return

    const { data: aData } = await supabase
      .from('cf_alumnos').select('id, nombre, telefono').eq('profe_id', profeId).order('nombre')

    setAlumnos(aData || [])
    const map: Record<string, Alumno> = {}
    ;(aData || []).forEach((a: Alumno) => { map[a.id] = a })
    setAlumnosMap(map)

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    let query = supabase.from('cf_turnos').select('*').eq('profe_id', profeId)

    if (vista === 'hoy') {
      const manana = new Date(hoy)
      manana.setDate(manana.getDate() + 1)
      query = query.gte('fecha_hora', hoy.toISOString()).lt('fecha_hora', manana.toISOString())
    } else if (vista === 'semana') {
      const finSemana = new Date(hoy)
      finSemana.setDate(finSemana.getDate() + 7)
      query = query.gte('fecha_hora', hoy.toISOString()).lt('fecha_hora', finSemana.toISOString())
    } else {
      query = query.gte('fecha_hora', hoy.toISOString())
    }

    const { data: tData } = await query.order('fecha_hora', { ascending: true })
    setTurnos(tData || [])
    setLoading(false)
  }

  async function guardarTurno() {
    if (!form.alumno_id || !form.fecha || !form.hora) return
    setGuardando(true)
    const profeId = localStorage.getItem('cf_profe_id')
    const { error } = await supabase.from('cf_turnos').insert({
      profe_id: profeId, alumno_id: form.alumno_id,
      espacio: form.espacio.trim(),
      fecha_hora: form.fecha + 'T' + form.hora + ':00',
      estado: 'pendiente',
    })
    if (!error) {
      setForm({ alumno_id: '', espacio: '', fecha: new Date().toISOString().split('T')[0], hora: '09:00' })
      setMostrarForm(false)
      cargarDatos()
    }
    setGuardando(false)
  }

  async function guardarEdicionTurno(turnoId: string) {
    setGuardando(true)
    const { error } = await supabase.from('cf_turnos').update({
      fecha_hora: formEdit.fecha + 'T' + formEdit.hora + ':00',
      espacio: formEdit.espacio.trim(),
    }).eq('id', turnoId)
    if (!error) { setEditandoTurno(null); cargarDatos() }
    setGuardando(false)
  }

  async function cambiarEstado(turnoId: string, nuevoEstado: string) {
    await supabase.from('cf_turnos').update({ estado: nuevoEstado }).eq('id', turnoId)
    cargarDatos()
  }

  async function eliminarTurno(turnoId: string) {
    if (!confirm('¿Eliminar este turno?')) return
    await supabase.from('cf_turnos').delete().eq('id', turnoId)
    cargarDatos()
  }

  function abrirEditar(t: Turno) {
    if (editandoTurno === t.id) { setEditandoTurno(null); return }
    const d = new Date(t.fecha_hora)
    setEditandoTurno(t.id)
    setFormEdit({
      fecha: d.toISOString().split('T')[0],
      hora: d.toTimeString().slice(0, 5),
      espacio: t.espacio || ''
    })
  }

  function formatFechaHora(fechaHora: string) {
    const d = new Date(fechaHora)
    return {
      fecha: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }),
      hora: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  function linkWA(alumno: Alumno, turno: Turno) {
    const { fecha, hora } = formatFechaHora(turno.fecha_hora)
    const msg = 'Hola ' + alumno.nombre + ', te confirmo tu turno el ' + fecha + ' a las ' + hora + 'hs' + (turno.espacio ? ' en ' + turno.espacio : '') + '. Te espero!'
    return 'https://wa.me/54' + alumno.telefono + '?text=' + encodeURIComponent(msg)
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
          <span className="text-zinc-400 text-sm">Turnos</span>
        </div>
        <button onClick={() => router.push('/' + slug)} className="text-zinc-500 hover:text-white text-sm transition-colors">← Volver</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Turnos</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {turnos.length} {vista === 'hoy' ? 'hoy' : vista === 'semana' ? 'esta semana' : 'próximos'}
            </p>
          </div>
          <button onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo turno
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {(['hoy', 'semana', 'todos'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vista === v ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              {v === 'hoy' ? 'Hoy' : v === 'semana' ? 'Esta semana' : 'Todos'}
            </button>
          ))}
        </div>

        {mostrarForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">Nuevo turno</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-zinc-500 text-xs mb-1 block">Alumno *</label>
                <select value={form.alumno_id} onChange={e => setForm({ ...form, alumno_id: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none">
                  <option value="">Seleccioná un alumno...</option>
                  {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Fecha *</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Hora *</label>
                <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-zinc-500 text-xs mb-1 block">Espacio / Lugar</label>
                <input type="text" value={form.espacio} onChange={e => setForm({ ...form, espacio: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
                  placeholder="Club Atlético, Cancha Norte, Online..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={guardarTurno} disabled={guardando || !form.alumno_id}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar turno'}
              </button>
              <button onClick={() => setMostrarForm(false)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {turnos.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-zinc-500 text-sm">
                Sin turnos {vista === 'hoy' ? 'para hoy' : vista === 'semana' ? 'esta semana' : 'próximos'}.
              </p>
            </div>
          ) : (
            turnos.map(t => {
              const { fecha, hora } = formatFechaHora(t.fecha_hora)
              const alumno = alumnosMap[t.alumno_id]
              return (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[56px]">
                        <p className="text-violet-400 font-semibold text-base">{hora}</p>
                        <p className="text-zinc-600 text-xs capitalize">{fecha}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{alumno?.nombre || '—'}</p>
                        <p className="text-xs text-zinc-500">{t.espacio || 'Sin lugar especificado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={t.estado} onChange={e => cambiarEstado(t.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full cursor-pointer focus:outline-none border-0 ${ESTADO_COLORS[t.estado] || 'bg-zinc-800 text-zinc-400'}`}>
                        {ESTADOS.map(e => <option key={e} value={e} className="bg-zinc-800 text-white">{e}</option>)}
                      </select>
                      {alumno?.telefono && (
                        <a href={linkWA(alumno, t)} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
                          WA
                        </a>
                      )}
                      <button onClick={() => abrirEditar(t)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${editandoTurno === t.id ? 'text-violet-300 border-violet-700' : 'text-zinc-400 hover:text-white border-zinc-700'}`}>
                        ✏️
                      </button>
                      <button onClick={() => eliminarTurno(t.id)}
                        className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 hover:border-red-800 transition-colors">
                        ✕
                      </button>
                    </div>
                  </div>

                  {editandoTurno === t.id && (
                    <div className="border-t border-zinc-800 p-4 bg-zinc-800/50 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Fecha</label>
                          <input type="date" value={formEdit.fecha} onChange={e => setFormEdit({ ...formEdit, fecha: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Hora</label>
                          <input type="time" value={formEdit.hora} onChange={e => setFormEdit({ ...formEdit, hora: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Lugar</label>
                          <input type="text" value={formEdit.espacio} onChange={e => setFormEdit({ ...formEdit, espacio: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => guardarEdicionTurno(t.id)} disabled={guardando}
                          className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                          {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button onClick={() => setEditandoTurno(null)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}