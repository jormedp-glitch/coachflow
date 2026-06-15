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

interface Rutina {
  id: string
  nombre: string
  semanas_total: number
}

interface Asignacion {
  id: string
  alumno_id: string
  rutina_id: string
  rutina_nombre: string
  rutina_semanas: number
}

export default function AlumnosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [alumnos, setAlumnos] = React.useState<Alumno[]>([])
  const [rutinas, setRutinas] = React.useState<Rutina[]>([])
  const [asignaciones, setAsignaciones] = React.useState<Record<string, Asignacion>>({})
  const [loading, setLoading] = React.useState(true)
  const [mostrarForm, setMostrarForm] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [asignando, setAsignando] = React.useState<string | null>(null)
  const [editando, setEditando] = React.useState<string | null>(null)
  const [rutinaSeleccionada, setRutinaSeleccionada] = React.useState('')
  const [form, setForm] = React.useState({ nombre: '', telefono: '', email: '', objetivo: '', notas: '' })
  const [formEdit, setFormEdit] = React.useState({ nombre: '', telefono: '', email: '', objetivo: '', notas: '' })

  React.useEffect(() => {
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) { router.push('/'); return }
    cargarDatos()
  }, [slug])

  async function cargarDatos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return

    const [{ data: aData }, { data: rData }] = await Promise.all([
      supabase.from('cf_alumnos').select('*').eq('profe_id', profeId).order('created_at', { ascending: false }),
      supabase.from('cf_rutinas').select('id, nombre, semanas_total').eq('profe_id', profeId).order('nombre')
    ])

    setAlumnos(aData || [])
    setRutinas(rData || [])

    if (aData && aData.length > 0) {
      const alumnoIds = aData.map((a: Alumno) => a.id)
      const { data: asigData } = await supabase
        .from('cf_asignaciones')
        .select('id, alumno_id, rutina_id')
        .in('alumno_id', alumnoIds)

      if (asigData && asigData.length > 0) {
        const rutinaIds = asigData.map((a: any) => a.rutina_id)
        const { data: rutinasData } = await supabase
          .from('cf_rutinas').select('id, nombre, semanas_total').in('id', rutinaIds)

        const rutinasById: Record<string, any> = {}
        ;(rutinasData || []).forEach((r: any) => { rutinasById[r.id] = r })

        const map: Record<string, Asignacion> = {}
        asigData.forEach((a: any) => {
          const rutina = rutinasById[a.rutina_id]
          map[a.alumno_id] = {
            id: a.id, alumno_id: a.alumno_id, rutina_id: a.rutina_id,
            rutina_nombre: rutina?.nombre || 'Rutina',
            rutina_semanas: rutina?.semanas_total || 0
          }
        })
        setAsignaciones(map)
      }
    }
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
      nombre: form.nombre.trim(), telefono: form.telefono.trim(),
      email: form.email.trim(), objetivo: form.objetivo.trim(),
      notas: form.notas.trim(), codigo_acceso: generarCodigo(), estado: 'activo'
    })
    if (!error) {
      setForm({ nombre: '', telefono: '', email: '', objetivo: '', notas: '' })
      setMostrarForm(false)
      cargarDatos()
    }
    setGuardando(false)
  }

  async function guardarEdicion(alumnoId: string) {
    if (!formEdit.nombre.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('cf_alumnos').update({
      nombre: formEdit.nombre.trim(), telefono: formEdit.telefono.trim(),
      email: formEdit.email.trim(), objetivo: formEdit.objetivo.trim(),
      notas: formEdit.notas.trim()
    }).eq('id', alumnoId)
    if (!error) { setEditando(null); cargarDatos() }
    setGuardando(false)
  }

  async function eliminarAlumno(alumnoId: string) {
    if (!confirm('¿Eliminar este alumno? Esta acción no se puede deshacer.')) return
    await supabase.from('cf_alumnos').delete().eq('id', alumnoId)
    cargarDatos()
  }

  async function asignarRutina(alumnoId: string) {
    if (!rutinaSeleccionada) return
    setGuardando(true)
    if (asignaciones[alumnoId]) {
      await supabase.from('cf_asignaciones').delete().eq('id', asignaciones[alumnoId].id)
    }
    const { error } = await supabase.from('cf_asignaciones').insert({
      alumno_id: alumnoId, rutina_id: rutinaSeleccionada,
      semana_actual: 1, fecha_inicio: new Date().toISOString().split('T')[0]
    })
    if (!error) { setAsignando(null); setRutinaSeleccionada(''); cargarDatos() }
    setGuardando(false)
  }

  function abrirEditar(a: Alumno) {
    if (editando === a.id) { setEditando(null); return }
    setEditando(a.id)
    setAsignando(null)
    setFormEdit({ nombre: a.nombre, telefono: a.telefono || '', email: a.email || '', objetivo: a.objetivo || '', notas: a.notas || '' })
  }

  function abrirAsignar(alumno: Alumno) {
    if (asignando === alumno.id) { setAsignando(null); setRutinaSeleccionada(''); return }
    setAsignando(alumno.id)
    setEditando(null)
    setRutinaSeleccionada(asignaciones[alumno.id]?.rutina_id || '')
  }

  function linkAlumno(codigo: string) { return window.location.origin + '/alumno/' + codigo }
  function copiarLink(codigo: string) { navigator.clipboard.writeText(linkAlumno(codigo)) }

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
          <button onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo alumno
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">Nuevo alumno</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="Juan Perez" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Telefono / WhatsApp</label>
                <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="3815123456" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="juan@email.com" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Objetivo</label>
                <input type="text" value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="Bajar de peso, ganar masa..." />
              </div>
            </div>
            <div>
              <label className="text-zinc-500 text-xs mb-1 block">Notas internas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" rows={2} placeholder="Lesiones, preferencias, observaciones..." />
            </div>
            <div className="flex gap-3">
              <button onClick={guardarAlumno} disabled={guardando}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar alumno'}
              </button>
              <button onClick={() => setMostrarForm(false)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
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
              <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-900 flex items-center justify-center text-sm font-medium text-violet-300">
                      {a.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{a.nombre}</p>
                      <p className="text-xs text-zinc-500">{a.objetivo || 'Sin objetivo'} · {a.telefono || 'Sin telefono'}</p>
                      {asignaciones[a.id] && (
                        <p className="text-xs text-violet-400 mt-0.5">
                          📋 {asignaciones[a.id].rutina_nombre} · {asignaciones[a.id].rutina_semanas} sem
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${a.estado === 'activo' ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {a.estado}
                    </span>
                    <button onClick={() => abrirEditar(a)}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 transition-colors">
                      ✏️ Editar
                    </button>
                    <button onClick={() => abrirAsignar(a)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${asignaciones[a.id] ? 'text-violet-400 hover:text-violet-300 border-violet-800 hover:border-violet-600' : 'text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-500'}`}>
                      {asignaciones[a.id] ? '📋 Rutina' : '+ Rutina'}
                    </button>
                    <button onClick={() => copiarLink(a.codigo_acceso)}
                      className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
                      Link
                    </button>
                    {a.telefono && (
                      <a href={'https://wa.me/54' + a.telefono + '?text=Hola ' + a.nombre + ', te mando tu link de CoachFlow: ' + linkAlumno(a.codigo_acceso)}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
                        WA
                      </a>
                    )}
                    <button onClick={() => eliminarAlumno(a.id)}
                      className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 hover:border-red-800 transition-colors">
                      ✕
                    </button>
                  </div>
                </div>

                {/* Panel editar */}
                {editando === a.id && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-800/50 space-y-3">
                    <p className="text-xs font-medium text-zinc-400">Editar alumno</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                        <input type="text" value={formEdit.nombre} onChange={e => setFormEdit({ ...formEdit, nombre: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-zinc-500 text-xs mb-1 block">Telefono</label>
                        <input type="text" value={formEdit.telefono} onChange={e => setFormEdit({ ...formEdit, telefono: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-zinc-500 text-xs mb-1 block">Email</label>
                        <input type="email" value={formEdit.email} onChange={e => setFormEdit({ ...formEdit, email: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-zinc-500 text-xs mb-1 block">Objetivo</label>
                        <input type="text" value={formEdit.objetivo} onChange={e => setFormEdit({ ...formEdit, objetivo: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-zinc-500 text-xs mb-1 block">Notas internas</label>
                        <textarea value={formEdit.notas} onChange={e => setFormEdit({ ...formEdit, notas: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" rows={2} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => guardarEdicion(a.id)} disabled={guardando}
                        className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button onClick={() => setEditando(null)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Panel asignar rutina */}
                {asignando === a.id && (
                  <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/50 flex items-center gap-3">
                    <span className="text-xs text-zinc-400 whitespace-nowrap">Asignar rutina:</span>
                    <select value={rutinaSeleccionada} onChange={e => setRutinaSeleccionada(e.target.value)}
                      className="flex-1 bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none">
                      <option value="">Selecciona una rutina...</option>
                      {rutinas.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre} ({r.semanas_total} sem)</option>
                      ))}
                    </select>
                    <button onClick={() => asignarRutina(a.id)} disabled={!rutinaSeleccionada || guardando}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap">
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setAsignando(null); setRutinaSeleccionada('') }}
                      className="text-zinc-500 hover:text-white text-sm px-2 py-2 transition-colors">✕</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}