'use client'
import React from 'react'
import { supabase } from '@/lib/supabase'

interface Ejercicio {
  id: string
  nombre: string
  grupo_muscular: string
  url_video: string
  descripcion: string
}

interface EjercicioRutina {
  id: string
  series: number
  repeticiones: string
  descanso_seg: number
  notas: string
  orden: number
  ejercicio: Ejercicio
}

interface Semana {
  id: string
  numero_semana: number
  ejercicios: EjercicioRutina[]
}

interface Alumno {
  id: string
  nombre: string
  objetivo: string
  profe: { nombre: string; deporte: string }
}

interface Asignacion {
  id: string
  semana_actual: number
  fecha_inicio: string
  rutina: { id: string; nombre: string; semanas_total: number }
}

interface Progreso {
  id: string
  fecha: string
  peso: number
  cintura: number
  cadera: number
  notas: string
}

export default function PortalAlumnoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = React.use(params)
  const [alumno, setAlumno] = React.useState<Alumno | null>(null)
  const [asignacion, setAsignacion] = React.useState<Asignacion | null>(null)
  const [semanas, setSemanas] = React.useState<Semana[]>([])
  const [semanaVista, setSemanaVista] = React.useState(1)
  const [completados, setCompletados] = React.useState<Set<string>>(new Set())
  const [progreso, setProgreso] = React.useState<Progreso[]>([])
  const [ultimoPago, setUltimoPago] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [noEncontrado, setNoEncontrado] = React.useState(false)
  const [seccion, setSeccion] = React.useState<'rutina' | 'progreso'>('rutina')

  React.useEffect(() => { cargarDatos() }, [codigo])

  async function cargarDatos() {
    const { data: alumnoData } = await supabase
      .from('cf_alumnos')
      .select('*, profe:cf_profes(nombre, deporte)')
      .eq('codigo_acceso', codigo.toUpperCase())
      .single()

    if (!alumnoData) { setNoEncontrado(true); setLoading(false); return }
    setAlumno(alumnoData)

    const { data: asignacionData } = await supabase
      .from('cf_asignaciones')
      .select('*, rutina:cf_rutinas(id, nombre, semanas_total)')
      .eq('alumno_id', alumnoData.id)
      .single()

    if (asignacionData) {
      setAsignacion(asignacionData)
      setSemanaVista(asignacionData.semana_actual || 1)

      const { data: semanasData } = await supabase
        .from('cf_rutina_semanas')
        .select('*')
        .eq('rutina_id', asignacionData.rutina.id)
        .order('numero_semana')

      const { data: ejerciciosData } = await supabase
        .from('cf_rutina_ejercicios')
        .select('*, ejercicio:cf_ejercicios(*)')
        .in('semana_id', semanasData?.map(s => s.id) || [])
        .order('orden')

      const semanasConEj: Semana[] = (semanasData || []).map(s => ({
        id: s.id,
        numero_semana: s.numero_semana,
        ejercicios: ejerciciosData?.filter(e => e.semana_id === s.id) || []
      }))
      setSemanas(semanasConEj)

      // Cargar completados de hoy
      const hoy = new Date().toISOString().split('T')[0]
      const { data: compData } = await supabase
        .from('cf_completados')
        .select('rutina_ejercicio_id')
        .eq('alumno_id', alumnoData.id)
        .eq('fecha', hoy)

      const set = new Set((compData || []).map((c: any) => c.rutina_ejercicio_id))
      setCompletados(set)
    }

    // Cargar progreso físico
    const { data: progData } = await supabase
      .from('cf_progreso')
      .select('*')
      .eq('alumno_id', alumnoData.id)
      .order('fecha', { ascending: false })
    setProgreso(progData || [])

    // Cargar último pago
    const { data: pagoData } = await supabase
      .from('cf_pagos')
      .select('fecha, monto, concepto')
      .eq('alumno_id', alumnoData.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .single()
    if (pagoData) setUltimoPago(pagoData.fecha)

    setLoading(false)
  }

  async function toggleCompletado(ejId: string) {
    if (!alumno) return
    const hoy = new Date().toISOString().split('T')[0]
    if (completados.has(ejId)) {
      await supabase.from('cf_completados').delete()
        .eq('alumno_id', alumno.id).eq('rutina_ejercicio_id', ejId).eq('fecha', hoy)
      const newSet = new Set(completados)
      newSet.delete(ejId)
      setCompletados(newSet)
    } else {
      await supabase.from('cf_completados').insert({
        alumno_id: alumno.id, rutina_ejercicio_id: ejId, fecha: hoy
      })
      const newSet = new Set(completados)
      newSet.add(ejId)
      setCompletados(newSet)
    }
  }

  function getYoutubeId(url: string) {
    const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  function formatFecha(fecha: string) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function estadoPago() {
    if (!ultimoPago) return { texto: 'Sin pagos registrados', color: 'text-zinc-500' }
    const ultimaFecha = new Date(ultimoPago + 'T12:00:00')
    const ahora = new Date()
    const diasDiff = Math.floor((ahora.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24))
    if (diasDiff <= 35) return { texto: 'Al dia · ultimo pago ' + formatFecha(ultimoPago), color: 'text-green-400' }
    return { texto: 'Vencido · ultimo pago ' + formatFecha(ultimoPago), color: 'text-red-400' }
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-400">Cargando...</p>
    </div>
  )

  if (noEncontrado) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-zinc-400 text-lg">Link no válido</p>
        <p className="text-zinc-600 text-sm mt-2">Pedile el link correcto a tu profe.</p>
      </div>
    </div>
  )

  const semanaActual = semanas.find(s => s.numero_semana === semanaVista)
  const ejCompletadosHoy = semanaActual?.ejercicios.filter(e => completados.has(e.id)).length || 0
  const totalEj = semanaActual?.ejercicios.length || 0
  const pago = estadoPago()

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-violet-400 font-bold text-lg">CoachFlow</p>
            <p className="text-zinc-500 text-xs">Portal del alumno</p>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-medium">{alumno?.nombre}</p>
            <p className="text-zinc-500 text-xs">{alumno?.profe?.nombre} · {alumno?.profe?.deporte}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Estado de pago */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Estado de cuenta</p>
          <p className={'text-xs font-medium ' + pago.color}>{pago.texto}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setSeccion('rutina')}
            className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (seccion === 'rutina' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400')}>
            Mi rutina
          </button>
          <button onClick={() => setSeccion('progreso')}
            className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (seccion === 'progreso' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400')}>
            Mi progreso {progreso.length > 0 && '(' + progreso.length + ')'}
          </button>
        </div>

        {seccion === 'rutina' && (
          <>
            {!asignacion ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-400 text-sm">Tu profe todavia no te asigno una rutina.</p>
                <p className="text-zinc-600 text-xs mt-2">Volvé a consultar pronto.</p>
              </div>
            ) : (
              <>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
                  <p className="text-xs text-zinc-500 mb-1">Tu plan actual</p>
                  <p className="text-white font-medium">{asignacion.rutina.nombre}</p>
                  <p className="text-zinc-500 text-xs mt-1">{asignacion.rutina.semanas_total} semanas · Semana actual: {asignacion.semana_actual}</p>
                  {totalEj > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-500">Hoy completaste</span>
                        <span className="text-violet-400">{ejCompletadosHoy}/{totalEj} ejercicios</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div className="bg-violet-500 h-1.5 rounded-full transition-all"
                          style={{ width: totalEj > 0 ? (ejCompletadosHoy / totalEj * 100) + '%' : '0%' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                  {Array.from({ length: asignacion.rutina.semanas_total }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setSemanaVista(n)}
                      className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ' +
                        (semanaVista === n ? 'bg-violet-600 text-white' : n === asignacion.semana_actual ? 'bg-zinc-700 text-violet-300 border border-violet-700' : 'bg-zinc-800 text-zinc-400')}>
                      Semana {n}
                      {n === asignacion.semana_actual && <span className="ml-1 text-xs">←</span>}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {!semanaActual || semanaActual.ejercicios.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                      <p className="text-zinc-500 text-sm">Sin ejercicios en esta semana todavia.</p>
                    </div>
                  ) : (
                    semanaActual.ejercicios.map((ej, idx) => {
                      const hecho = completados.has(ej.id)
                      return (
                        <div key={ej.id} className={'bg-zinc-900 border rounded-xl overflow-hidden transition-colors ' + (hecho ? 'border-violet-700' : 'border-zinc-800')}>
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-zinc-600 text-xs">{idx + 1}</span>
                                  <p className={'font-medium text-sm ' + (hecho ? 'text-violet-300 line-through' : 'text-white')}>{ej.ejercicio?.nombre}</p>
                                  {ej.ejercicio?.grupo_muscular && (
                                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{ej.ejercicio.grupo_muscular}</span>
                                  )}
                                </div>
                                <div className="flex gap-3 mt-2">
                                  <div className="text-center">
                                    <p className="text-violet-400 font-semibold text-lg">{ej.series}</p>
                                    <p className="text-zinc-500 text-xs">series</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-violet-400 font-semibold text-lg">{ej.repeticiones}</p>
                                    <p className="text-zinc-500 text-xs">reps</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-violet-400 font-semibold text-lg">{ej.descanso_seg}s</p>
                                    <p className="text-zinc-500 text-xs">descanso</p>
                                  </div>
                                </div>
                                {ej.notas && <p className="text-zinc-500 text-xs mt-2 italic">{ej.notas}</p>}
                              </div>
                              <div className="flex flex-col gap-2 ml-3">
                                {ej.ejercicio?.url_video && (
                                  <a href={ej.ejercicio.url_video} target="_blank" rel="noopener noreferrer"
                                    className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors text-center">
                                    Ver video
                                  </a>
                                )}
                                <button onClick={() => toggleCompletado(ej.id)}
                                  className={'text-xs px-3 py-1.5 rounded-lg transition-colors ' + (hecho ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
                                  {hecho ? '✓ Hecho' : 'Marcar'}
                                </button>
                              </div>
                            </div>
                          </div>
                          {ej.ejercicio?.url_video && getYoutubeId(ej.ejercicio.url_video) && (
                            <div className="border-t border-zinc-800">
                              <img
                                src={'https://img.youtube.com/vi/' + getYoutubeId(ej.ejercicio.url_video) + '/mqdefault.jpg'}
                                alt={ej.ejercicio.nombre}
                                className="w-full h-36 object-cover opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => window.open(ej.ejercicio.url_video, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </>
        )}

        {seccion === 'progreso' && (
          <div className="space-y-3">
            {progreso.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-400 text-sm">Tu profe todavia no cargo mediciones.</p>
                <p className="text-zinc-600 text-xs mt-1">Las mediciones aparecen aca cuando tu profe las registra.</p>
              </div>
            ) : (
              progreso.map((p, idx) => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-zinc-500">{formatFecha(p.fecha)}</p>
                    {idx === 0 && <span className="text-xs bg-violet-900/40 text-violet-400 px-2 py-0.5 rounded-full">Ultima medicion</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {p.peso && (
                      <div className="text-center">
                        <p className="text-white font-semibold text-lg">{p.peso}kg</p>
                        <p className="text-zinc-500 text-xs">Peso</p>
                      </div>
                    )}
                    {p.cintura && (
                      <div className="text-center">
                        <p className="text-white font-semibold text-lg">{p.cintura}cm</p>
                        <p className="text-zinc-500 text-xs">Cintura</p>
                      </div>
                    )}
                    {p.cadera && (
                      <div className="text-center">
                        <p className="text-white font-semibold text-lg">{p.cadera}cm</p>
                        <p className="text-zinc-500 text-xs">Cadera</p>
                      </div>
                    )}
                  </div>
                  {p.notas && <p className="text-zinc-500 text-xs mt-3 italic">{p.notas}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}