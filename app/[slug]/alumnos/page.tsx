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
  altura_cm: number | null
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

interface Progreso {
  id: string
  fecha: string
  peso: number
  cintura: number
  cadera: number
  porcentaje_grasa: number
  pecho_cm: number
  bicep_cm: number
  metrica1_nombre: string
  metrica1_valor: number
  metrica2_nombre: string
  metrica2_valor: number
  notas: string
}

function calcularIMC(peso: number, altura_cm: number | null): { valor: number; categoria: string; color: string } | null {
  if (!altura_cm || !peso) return null
  const altura_m = altura_cm / 100
  const imc = peso / (altura_m * altura_m)
  const valor = Math.round(imc * 10) / 10
  if (imc < 18.5) return { valor, categoria: 'Bajo peso', color: 'text-blue-400' }
  if (imc < 25) return { valor, categoria: 'Normal', color: 'text-green-400' }
  if (imc < 30) return { valor, categoria: 'Sobrepeso', color: 'text-yellow-400' }
  return { valor, categoria: 'Obesidad', color: 'text-red-400' }
}

export default function AlumnosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [alumnos, setAlumnos] = React.useState<Alumno[]>([])
  const [rutinas, setRutinas] = React.useState<Rutina[]>([])
  const [asignaciones, setAsignaciones] = React.useState<Record<string, Asignacion>>({})
  const [progresosMap, setProgresosMap] = React.useState<Record<string, Progreso[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [mostrarForm, setMostrarForm] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [asignando, setAsignando] = React.useState<string | null>(null)
  const [editando, setEditando] = React.useState<string | null>(null)
  const [progresando, setProgresando] = React.useState<string | null>(null)
  const [rutinaSeleccionada, setRutinaSeleccionada] = React.useState('')
  const [linkCopiado, setLinkCopiado] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({ nombre: '', telefono: '', email: '', objetivo: '', notas: '', altura_cm: '' })
  const [formEdit, setFormEdit] = React.useState({ nombre: '', telefono: '', email: '', objetivo: '', notas: '', altura_cm: '' })
  const [formProgreso, setFormProgreso] = React.useState({
    fecha: new Date().toISOString().split('T')[0],
    peso: '', cintura: '', cadera: '',
    porcentaje_grasa: '', pecho_cm: '', bicep_cm: '',
    metrica1_nombre: '', metrica1_valor: '',
    metrica2_nombre: '', metrica2_valor: '',
    notas: ''
  })

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
        .from('cf_asignaciones').select('id, alumno_id, rutina_id').in('alumno_id', alumnoIds)

      if (asigData && asigData.length > 0) {
        const rutinaIds = asigData.map((a: any) => a.rutina_id)
        const { data: rutinasData } = await supabase
          .from('cf_rutinas').select('id, nombre, semanas_total').in('id', rutinaIds)
        const rutinasById: Record<string, any> = {}
        ;(rutinasData || []).forEach((r: any) => { rutinasById[r.id] = r })
        const map: Record<string, Asignacion> = {}
        asigData.forEach((a: any) => {
          const rutina = rutinasById[a.rutina_id]
          map[a.alumno_id] = { id: a.id, alumno_id: a.alumno_id, rutina_id: a.rutina_id, rutina_nombre: rutina?.nombre || 'Rutina', rutina_semanas: rutina?.semanas_total || 0 }
        })
        setAsignaciones(map)
      }

      const { data: progData } = await supabase
        .from('cf_progreso').select('*').in('alumno_id', alumnoIds).order('fecha', { ascending: false })
      const progMap: Record<string, Progreso[]> = {}
      ;(progData || []).forEach((p: any) => {
        if (!progMap[p.alumno_id]) progMap[p.alumno_id] = []
        progMap[p.alumno_id].push(p)
      })
      setProgresosMap(progMap)
    }

    setLoading(false)
  }

  function generarCodigo() { return Math.random().toString(36).substring(2, 8).toUpperCase() }

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
      altura_cm: form.altura_cm ? Number(form.altura_cm) : null,
      codigo_acceso: generarCodigo(),
      estado: 'activo'
    })
    if (!error) {
      setForm({ nombre: '', telefono: '', email: '', objetivo: '', notas: '', altura_cm: '' })
      setMostrarForm(false)
      cargarDatos()
    }
    setGuardando(false)
  }

  async function guardarEdicion(alumnoId: string) {
    if (!formEdit.nombre.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('cf_alumnos').update({
      nombre: formEdit.nombre.trim(),
      telefono: formEdit.telefono.trim(),
      email: formEdit.email.trim(),
      objetivo: formEdit.objetivo.trim(),
      notas: formEdit.notas.trim(),
      altura_cm: formEdit.altura_cm ? Number(formEdit.altura_cm) : null
    }).eq('id', alumnoId)
    if (!error) { setEditando(null); cargarDatos() }
    setGuardando(false)
  }

  async function eliminarAlumno(alumnoId: string) {
    if (!confirm('¿Eliminar este alumno?')) return
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

  async function guardarProgreso(alumnoId: string) {
    if (!formProgreso.peso && !formProgreso.cintura && !formProgreso.cadera) return
    setGuardando(true)
    const { error } = await supabase.from('cf_progreso').insert({
      alumno_id: alumnoId,
      fecha: formProgreso.fecha,
      peso: formProgreso.peso ? Number(formProgreso.peso) : null,
      cintura: formProgreso.cintura ? Number(formProgreso.cintura) : null,
      cadera: formProgreso.cadera ? Number(formProgreso.cadera) : null,
      porcentaje_grasa: formProgreso.porcentaje_grasa ? Number(formProgreso.porcentaje_grasa) : null,
      pecho_cm: formProgreso.pecho_cm ? Number(formProgreso.pecho_cm) : null,
      bicep_cm: formProgreso.bicep_cm ? Number(formProgreso.bicep_cm) : null,
      metrica1_nombre: formProgreso.metrica1_nombre.trim() || null,
      metrica1_valor: formProgreso.metrica1_valor ? Number(formProgreso.metrica1_valor) : null,
      metrica2_nombre: formProgreso.metrica2_nombre.trim() || null,
      metrica2_valor: formProgreso.metrica2_valor ? Number(formProgreso.metrica2_valor) : null,
      notas: formProgreso.notas.trim()
    })
    if (!error) {
      setFormProgreso({
        fecha: new Date().toISOString().split('T')[0],
        peso: '', cintura: '', cadera: '',
        porcentaje_grasa: '', pecho_cm: '', bicep_cm: '',
        metrica1_nombre: '', metrica1_valor: '',
        metrica2_nombre: '', metrica2_valor: '',
        notas: ''
      })
      cargarDatos()
    }
    setGuardando(false)
  }

  async function eliminarProgreso(progresoId: string) {
    if (!confirm('¿Eliminar esta medición?')) return
    await supabase.from('cf_progreso').delete().eq('id', progresoId)
    cargarDatos()
  }

  function abrirEditar(a: Alumno) {
    if (editando === a.id) { setEditando(null); return }
    setEditando(a.id); setAsignando(null); setProgresando(null)
    setFormEdit({
      nombre: a.nombre, telefono: a.telefono || '',
      email: a.email || '', objetivo: a.objetivo || '',
      notas: a.notas || '', altura_cm: a.altura_cm ? String(a.altura_cm) : ''
    })
  }

  function abrirAsignar(alumno: Alumno) {
    if (asignando === alumno.id) { setAsignando(null); setRutinaSeleccionada(''); return }
    setAsignando(alumno.id); setEditando(null); setProgresando(null)
    setRutinaSeleccionada(asignaciones[alumno.id]?.rutina_id || '')
  }

  function abrirProgreso(alumnoId: string) {
    if (progresando === alumnoId) { setProgresando(null); return }
    setProgresando(alumnoId); setEditando(null); setAsignando(null)
  }

  function formatFecha(fecha: string) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  function linkAlumno(codigo: string) { return window.location.origin + '/alumno/' + codigo }

  async function copiarLink(alumnoId: string, codigo: string) {
    const url = linkAlumno(codigo)
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopiado(alumnoId)
      setTimeout(() => setLinkCopiado(null), 2000)
    } catch {
      // Fallback para navegadores que bloquean clipboard
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setLinkCopiado(alumnoId)
      setTimeout(() => setLinkCopiado(null), 2000)
    }
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
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="Juan Perez" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Teléfono</label>
                <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="3815123456" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="juan@email.com" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Altura (cm)</label>
                <input type="number" value={form.altura_cm} onChange={e => setForm({ ...form, altura_cm: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="170" />
              </div>
              <div className="col-span-2">
                <label className="text-zinc-500 text-xs mb-1 block">Objetivo</label>
                <input type="text" value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="Bajar de peso, mejorar técnica..." />
              </div>
            </div>
            <div>
              <label className="text-zinc-500 text-xs mb-1 block">Notas internas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" rows={2} />
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

                {/* Fila principal */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-900 flex items-center justify-center text-sm font-medium text-violet-300">
                      {a.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{a.nombre}</p>
                      <p className="text-xs text-zinc-500">
                        {a.objetivo || 'Sin objetivo'} · {a.telefono || 'Sin telefono'}
                        {a.altura_cm && <span className="ml-1">· {a.altura_cm}cm</span>}
                      </p>
                      {asignaciones[a.id] && (
                        <p className="text-xs text-violet-400 mt-0.5">📋 {asignaciones[a.id].rutina_nombre} · {asignaciones[a.id].rutina_semanas} sem</p>
                      )}
                      {(() => {
                        const progs = progresosMap[a.id]
                        if (!progs || progs.length === 0 || !a.altura_cm) return null
                        const ultimo = progs[0]
                        const imc = calcularIMC(ultimo.peso, a.altura_cm)
                        if (!imc) return null
                        return (
                          <p className={'text-xs mt-0.5 ' + imc.color}>IMC {imc.valor} · {imc.categoria}</p>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-1 rounded-full ${a.estado === 'activo' ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {a.estado}
                    </span>
                    <button onClick={() => abrirEditar(a)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${editando === a.id ? 'text-violet-300 border-violet-700' : 'text-zinc-400 hover:text-white border-zinc-700'}`}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => abrirAsignar(a)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${asignaciones[a.id] ? 'text-violet-400 border-violet-800' : 'text-zinc-400 border-zinc-700'}`}>
                      {asignaciones[a.id] ? '📋 Rutina' : '+ Rutina'}
                    </button>
                    <button onClick={() => abrirProgreso(a.id)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${progresando === a.id ? 'text-emerald-300 border-emerald-700' : 'text-zinc-400 hover:text-white border-zinc-700'}`}>
                      📊 {progresosMap[a.id]?.length ? progresosMap[a.id].length + ' med.' : 'Progreso'}
                    </button>
                    <button
                      onClick={() => copiarLink(a.id, a.codigo_acceso)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${linkCopiado === a.id ? 'text-emerald-400 border-emerald-700' : 'text-violet-400 hover:text-violet-300 border-zinc-700'}`}>
                      {linkCopiado === a.id ? '✓ Copiado' : 'Link'}
                    </button>
                    {a.telefono && (
                      <a href={'https://wa.me/54' + a.telefono + '?text=Hola ' + a.nombre + ', te mando tu link de CoachFlow: ' + linkAlumno(a.codigo_acceso)}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded border border-zinc-700 transition-colors">
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
                        <label className="text-zinc-500 text-xs mb-1 block">Teléfono</label>
                        <input type="text" value={formEdit.telefono} onChange={e => setFormEdit({ ...formEdit, telefono: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-zinc-500 text-xs mb-1 block">Email</label>
                        <input type="email" value={formEdit.email} onChange={e => setFormEdit({ ...formEdit, email: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-zinc-500 text-xs mb-1 block">Altura (cm)</label>
                        <input type="number" value={formEdit.altura_cm} onChange={e => setFormEdit({ ...formEdit, altura_cm: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" placeholder="170" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-zinc-500 text-xs mb-1 block">Objetivo</label>
                        <input type="text" value={formEdit.objetivo} onChange={e => setFormEdit({ ...formEdit, objetivo: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-zinc-500 text-xs mb-1 block">Notas</label>
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
                      {rutinas.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.semanas_total} sem)</option>)}
                    </select>
                    <button onClick={() => asignarRutina(a.id)} disabled={!rutinaSeleccionada || guardando}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setAsignando(null); setRutinaSeleccionada('') }}
                      className="text-zinc-500 hover:text-white text-sm px-2 transition-colors">✕</button>
                  </div>
                )}

                {/* Panel progreso */}
                {progresando === a.id && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-800/50 space-y-4">
                    <p className="text-xs font-medium text-zinc-400">Progreso físico</p>

                    {(() => {
                      const progs = progresosMap[a.id]
                      if (!progs || progs.length === 0 || !a.altura_cm) return null
                      const ultimo = progs[0]
                      const imc = calcularIMC(ultimo.peso, a.altura_cm)
                      if (!imc) return null
                      return (
                        <div className="bg-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-zinc-500 mb-0.5">IMC actual ({formatFecha(ultimo.fecha)})</p>
                            <p className={'text-2xl font-semibold ' + imc.color}>{imc.valor}</p>
                          </div>
                          <span className={'text-sm font-medium px-3 py-1 rounded-full bg-zinc-700 ' + imc.color}>{imc.categoria}</span>
                        </div>
                      )
                    })()}

                    <div className="bg-zinc-800 rounded-lg p-3 space-y-3">
                      <p className="text-xs text-zinc-500">Nueva medición</p>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Fecha</label>
                          <input type="date" value={formProgreso.fecha} onChange={e => setFormProgreso({ ...formProgreso, fecha: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Peso (kg)</label>
                          <input type="number" value={formProgreso.peso} onChange={e => setFormProgreso({ ...formProgreso, peso: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="70" step="0.1" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Cintura (cm)</label>
                          <input type="number" value={formProgreso.cintura} onChange={e => setFormProgreso({ ...formProgreso, cintura: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="80" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Cadera (cm)</label>
                          <input type="number" value={formProgreso.cadera} onChange={e => setFormProgreso({ ...formProgreso, cadera: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="90" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">% Grasa corporal</label>
                          <input type="number" value={formProgreso.porcentaje_grasa} onChange={e => setFormProgreso({ ...formProgreso, porcentaje_grasa: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="20" step="0.1" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Pecho (cm)</label>
                          <input type="number" value={formProgreso.pecho_cm} onChange={e => setFormProgreso({ ...formProgreso, pecho_cm: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="95" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Bícep (cm)</label>
                          <input type="number" value={formProgreso.bicep_cm} onChange={e => setFormProgreso({ ...formProgreso, bicep_cm: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="35" />
                        </div>
                      </div>

                      <div className="border-t border-zinc-700 pt-3">
                        <p className="text-zinc-600 text-xs mb-2">Métricas personalizadas (ej: Tiempo 5K, Velocidad de saque...)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-zinc-500 text-xs mb-1 block">Métrica 1 — Nombre</label>
                            <input type="text" value={formProgreso.metrica1_nombre} onChange={e => setFormProgreso({ ...formProgreso, metrica1_nombre: e.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="Tiempo 5K" />
                          </div>
                          <div>
                            <label className="text-zinc-500 text-xs mb-1 block">Métrica 1 — Valor</label>
                            <input type="number" value={formProgreso.metrica1_valor} onChange={e => setFormProgreso({ ...formProgreso, metrica1_valor: e.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="28.5" step="0.1" />
                          </div>
                          <div>
                            <label className="text-zinc-500 text-xs mb-1 block">Métrica 2 — Nombre</label>
                            <input type="text" value={formProgreso.metrica2_nombre} onChange={e => setFormProgreso({ ...formProgreso, metrica2_nombre: e.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="FC reposo" />
                          </div>
                          <div>
                            <label className="text-zinc-500 text-xs mb-1 block">Métrica 2 — Valor</label>
                            <input type="number" value={formProgreso.metrica2_valor} onChange={e => setFormProgreso({ ...formProgreso, metrica2_valor: e.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="62" step="0.1" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-zinc-500 text-xs mb-1 block">Notas</label>
                        <input type="text" value={formProgreso.notas} onChange={e => setFormProgreso({ ...formProgreso, notas: e.target.value })}
                          className="w-full bg-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs border border-zinc-600 focus:outline-none" placeholder="Observaciones..." />
                      </div>
                      <button onClick={() => guardarProgreso(a.id)} disabled={guardando}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                        {guardando ? 'Guardando...' : '+ Guardar medición'}
                      </button>
                    </div>

                    {progresosMap[a.id]?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500">Historial</p>
                        {progresosMap[a.id].map((p, idx) => {
                          const imc = calcularIMC(p.peso, a.altura_cm)
                          return (
                            <div key={p.id} className="bg-zinc-800 rounded-lg px-3 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-500">{formatFecha(p.fecha)}</span>
                                  {idx === 0 && <span className="text-xs bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded">última</span>}
                                </div>
                                <button onClick={() => eliminarProgreso(p.id)}
                                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors">✕</button>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs">
                                {p.peso && <span className="text-white font-medium">{p.peso}kg</span>}
                                {imc && <span className={imc.color}>IMC {imc.valor} ({imc.categoria})</span>}
                                {p.cintura && <span className="text-zinc-400">cin: {p.cintura}cm</span>}
                                {p.cadera && <span className="text-zinc-400">cad: {p.cadera}cm</span>}
                                {p.pecho_cm && <span className="text-zinc-400">pecho: {p.pecho_cm}cm</span>}
                                {p.bicep_cm && <span className="text-zinc-400">bícep: {p.bicep_cm}cm</span>}
                                {p.porcentaje_grasa && <span className="text-zinc-400">grasa: {p.porcentaje_grasa}%</span>}
                                {p.metrica1_nombre && p.metrica1_valor && <span className="text-zinc-400">{p.metrica1_nombre}: {p.metrica1_valor}</span>}
                                {p.metrica2_nombre && p.metrica2_valor && <span className="text-zinc-400">{p.metrica2_nombre}: {p.metrica2_valor}</span>}
                              </div>
                              {p.notas && <p className="text-zinc-600 text-xs mt-1 italic">{p.notas}</p>}
                            </div>
                          )
                        })}
                      </div>
                    )}
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
