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
  altura_cm: number | null
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
  porcentaje_grasa: number
  pecho_cm: number
  bicep_cm: number
  metrica1_nombre: string
  metrica1_valor: number
  metrica2_nombre: string
  metrica2_valor: number
  notas: string
}

interface Pago {
  id: string
  fecha: string
  monto: number
  concepto: string
  medio_pago: string
}

interface DiaCompletado {
  fecha: string
  cantidad: number
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

export default function PortalAlumnoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = React.use(params)
  const [alumno, setAlumno] = React.useState<Alumno | null>(null)
  const [asignacion, setAsignacion] = React.useState<Asignacion | null>(null)
  const [semanas, setSemanas] = React.useState<Semana[]>([])
  const [semanaVista, setSemanaVista] = React.useState(1)
  const [completados, setCompletados] = React.useState<Set<string>>(new Set())
  const [progreso, setProgreso] = React.useState<Progreso[]>([])
  const [pagos, setPagos] = React.useState<Pago[]>([])
  const [diasCompletados, setDiasCompletados] = React.useState<DiaCompletado[]>([])
  const [ultimoPago, setUltimoPago] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [noEncontrado, setNoEncontrado] = React.useState(false)
  const [seccion, setSeccion] = React.useState<'rutina' | 'historial' | 'progreso' | 'pagos'>('rutina')

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

      const hoy = new Date().toISOString().split('T')[0]
      const { data: compData } = await supabase
        .from('cf_completados')
        .select('rutina_ejercicio_id')
        .eq('alumno_id', alumnoData.id)
        .eq('fecha', hoy)
      const set = new Set((compData || []).map((c: any) => c.rutina_ejercicio_id))
      setCompletados(set)

      // Historial de días con entrenamientos completados
      const { data: historialComp } = await supabase
        .from('cf_completados')
        .select('fecha')
        .eq('alumno_id', alumnoData.id)
        .order('fecha', { ascending: false })

      const diasMap: Record<string, number> = {}
      ;(historialComp || []).forEach((c: any) => {
        diasMap[c.fecha] = (diasMap[c.fecha] || 0) + 1
      })
      const dias: DiaCompletado[] = Object.entries(diasMap)
        .map(([fecha, cantidad]) => ({ fecha, cantidad }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
      setDiasCompletados(dias)
    }

    const { data: progData } = await supabase
      .from('cf_progreso')
      .select('*')
      .eq('alumno_id', alumnoData.id)
      .order('fecha', { ascending: false })
    setProgreso(progData || [])

    // Pagos del alumno
    const { data: pagosData } = await supabase
      .from('cf_pagos')
      .select('*')
      .eq('alumno_id', alumnoData.id)
      .order('fecha', { ascending: false })
    setPagos(pagosData || [])
    if (pagosData && pagosData.length > 0) setUltimoPago(pagosData[0].fecha)

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

  function formatPesos(n: number) {
    return '$' + Number(n).toLocaleString('es-AR')
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
            <p className="text-zinc-500 text-xs">{alumno?.profe?.nombre}{alumno?.profe?.deporte ? ' · ' + alumno.profe.deporte : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Estado de pago */}
        <div className={'border rounded-xl px-4 py-3 mb-5 flex items-center justify-between ' + (pago.color === 'text-red-400' ? 'bg-red-950/20 border-red-900/40' : 'bg-zinc-900 border-zinc-800')}>
          <p className="text-xs text-zinc-500">Estado de cuenta</p>
          <p className={'text-xs font-medium ' + pago.color}>{pago.texto}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button onClick={() => setSeccion('rutina')}
            className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ' + (seccion === 'rutina' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400')}>
            Mi plan
          </button>
          <button onClick={() => setSeccion('historial')}
            className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ' + (seccion === 'historial' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400')}>
            Historial {diasCompletados.length > 0 && '(' + diasCompletados.length + ')'}
          </button>
          <button onClick={() => setSeccion('progreso')}
            className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ' + (seccion === 'progreso' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400')}>
            Mi progreso {progreso.length > 0 && '(' + progreso.length + ')'}
          </button>
          <button onClick={() => setSeccion('pagos')}
            className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ' + (seccion === 'pagos' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400')}>
            Mis pagos {pagos.length > 0 && '(' + pagos.length + ')'}
          </button>
        </div>

        {/* TAB: MI PLAN */}
        {seccion === 'rutina' && (
          <>
            {!asignacion ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-400 text-sm">Tu profe todavia no te asigno un plan.</p>
                <p className="text-zinc-600 text-xs mt-2">Volvé a consultar pronto.</p>
              </div>
            ) : (
              <>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
                  <p className="text-xs text-zinc-500 mb-1">Tu plan actual</p>
                  <p className="text-white font-medium">{asignacion.rutina.nombre}</p>
                  <p className="text-zinc-500 text-xs mt-1">{asignacion.rutina.semanas_total} semanas · Semana actual: {asignacion.semana_actual}</p>
{asignacion.semana_actual < asignacion.rutina.semanas_total && (
  <button
    onClick={async () => {
      await supabase.from('cf_asignaciones')
        .update({ semana_actual: asignacion.semana_actual + 1 })
        .eq('id', asignacion.id)
      cargarDatos()
    }}
    className="mt-2 text-xs text-violet-400 hover:text-violet-300 border border-violet-800 hover:border-violet-600 px-3 py-1 rounded-lg transition-colors">
    ▶ Avanzar a semana {asignacion.semana_actual + 1}
  </button>
)}
{asignacion.semana_actual === asignacion.rutina.semanas_total && (
  <p className="text-xs text-emerald-400 mt-2">🎉 ¡Completaste todas las semanas del plan!</p>
)}
                  {totalEj > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-500">Hoy completaste</span>
                        <span className="text-violet-400">{ejCompletadosHoy}/{totalEj} actividades</span>
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
                      <p className="text-zinc-500 text-sm">Sin actividades en esta semana todavia.</p>
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
                                    <p className="text-zinc-500 text-xs">cantidad</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-violet-400 font-semibold text-lg">{ej.repeticiones}</p>
                                    <p className="text-zinc-500 text-xs">detalle</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-violet-400 font-semibold text-lg">{ej.descanso_seg}s</p>
                                    <p className="text-zinc-500 text-xs">duración</p>
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

        {/* TAB: HISTORIAL */}
        {seccion === 'historial' && (
          <div className="space-y-3">
            {diasCompletados.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-400 text-sm">Todavia no completaste ningún entrenamiento.</p>
                <p className="text-zinc-600 text-xs mt-1">Marcá tus actividades como hechas y aparecen acá.</p>
              </div>
            ) : (
              <>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-500">Total de días entrenados</p>
                  <p className="text-lg font-semibold text-violet-400">{diasCompletados.length} días</p>
                </div>
                {diasCompletados.map(d => (
                  <div key={d.fecha} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-900/40 flex items-center justify-center">
                        <span className="text-violet-400 text-sm">✓</span>
                      </div>
                      <div>
                        <p className="text-sm text-white">{formatFecha(d.fecha)}</p>
                        <p className="text-xs text-zinc-500">{d.cantidad} {d.cantidad === 1 ? 'actividad completada' : 'actividades completadas'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(d.cantidad, 5) }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-violet-500" />
                      ))}
                      {d.cantidad > 5 && <span className="text-xs text-zinc-500 ml-1">+{d.cantidad - 5}</span>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* TAB: MI PROGRESO */}
        {seccion === 'progreso' && (
          <div className="space-y-4">
            {progreso.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-400 text-sm">Tu profe todavia no cargo mediciones.</p>
                <p className="text-zinc-600 text-xs mt-1">Las mediciones aparecen aca cuando tu profe las registra.</p>
              </div>
            ) : (
              <>
                {alumno?.altura_cm && progreso[0]?.peso && (() => {
                  const imc = calcularIMC(progreso[0].peso, alumno.altura_cm)
                  if (!imc) return null
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <p className="text-xs text-zinc-500 mb-3">Tu índice de masa corporal</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={'text-4xl font-semibold ' + imc.color}>{imc.valor}</p>
                          <p className={'text-sm mt-1 ' + imc.color}>{imc.categoria}</p>
                        </div>
                        <div className="text-right text-xs text-zinc-500">
                          <p>Altura: {alumno.altura_cm}cm</p>
                          <p>Peso actual: {progreso[0].peso}kg</p>
                          <p className="mt-1">Última medición</p>
                          <p>{formatFecha(progreso[0].fecha)}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex text-xs text-zinc-600 justify-between mb-1">
                          <span>16</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
                        </div>
                        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-400 to-red-500 relative">
                          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-zinc-900 shadow"
                            style={{ left: Math.min(Math.max((imc.valor - 16) / (40 - 16) * 100, 2), 98) + '%', transform: 'translate(-50%, -50%)' }} />
                        </div>
                        <div className="flex text-xs justify-between mt-1">
                          <span className="text-blue-400">Bajo</span>
                          <span className="text-green-400">Normal</span>
                          <span className="text-yellow-400">Sobre</span>
                          <span className="text-red-400">Obesidad</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {progreso.length >= 2 && progreso[0].peso && progreso[1].peso && (() => {
                  const diff = Math.round((progreso[0].peso - progreso[1].peso) * 10) / 10
                  const positivo = diff < 0
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                      <p className="text-xs text-zinc-500">Variación de peso</p>
                      <p className={'text-sm font-medium ' + (positivo ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-zinc-400')}>
                        {diff > 0 ? '+' : ''}{diff}kg desde la medición anterior
                      </p>
                    </div>
                  )
                })()}

                {progreso.map((p, idx) => {
                  const imc = calcularIMC(p.peso, alumno?.altura_cm || null)
                  return (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-zinc-500">{formatFecha(p.fecha)}</p>
                        {idx === 0 && <span className="text-xs bg-violet-900/40 text-violet-400 px-2 py-0.5 rounded-full">Última medición</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-3">
                        {p.peso && <div className="text-center"><p className="text-white font-semibold text-lg">{p.peso}kg</p><p className="text-zinc-500 text-xs">Peso</p></div>}
                        {imc && <div className="text-center"><p className={'font-semibold text-lg ' + imc.color}>{imc.valor}</p><p className="text-zinc-500 text-xs">IMC</p></div>}
                        {p.cintura && <div className="text-center"><p className="text-white font-semibold text-lg">{p.cintura}cm</p><p className="text-zinc-500 text-xs">Cintura</p></div>}
                        {p.cadera && <div className="text-center"><p className="text-white font-semibold text-lg">{p.cadera}cm</p><p className="text-zinc-500 text-xs">Cadera</p></div>}
                        {p.pecho_cm && <div className="text-center"><p className="text-white font-semibold text-lg">{p.pecho_cm}cm</p><p className="text-zinc-500 text-xs">Pecho</p></div>}
                        {p.bicep_cm && <div className="text-center"><p className="text-white font-semibold text-lg">{p.bicep_cm}cm</p><p className="text-zinc-500 text-xs">Bícep</p></div>}
                        {p.porcentaje_grasa && <div className="text-center"><p className="text-white font-semibold text-lg">{p.porcentaje_grasa}%</p><p className="text-zinc-500 text-xs">% Grasa</p></div>}
                        {p.metrica1_nombre && p.metrica1_valor && <div className="text-center"><p className="text-white font-semibold text-lg">{p.metrica1_valor}</p><p className="text-zinc-500 text-xs">{p.metrica1_nombre}</p></div>}
                        {p.metrica2_nombre && p.metrica2_valor && <div className="text-center"><p className="text-white font-semibold text-lg">{p.metrica2_valor}</p><p className="text-zinc-500 text-xs">{p.metrica2_nombre}</p></div>}
                      </div>
                      {p.notas && <p className="text-zinc-500 text-xs mt-3 italic">{p.notas}</p>}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* TAB: MIS PAGOS */}
        {seccion === 'pagos' && (
          <div className="space-y-3">
            {pagos.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-400 text-sm">Sin pagos registrados todavia.</p>
                <p className="text-zinc-600 text-xs mt-1">Los pagos aparecen aca cuando tu profe los registra.</p>
              </div>
            ) : (
              <>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">Total pagado</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {formatPesos(pagos.reduce((acc, p) => acc + Number(p.monto), 0))}
                  </p>
                </div>
                {pagos.map((p, idx) => (
                  <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{p.concepto || 'Cuota'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-zinc-500">{formatFecha(p.fecha)}</p>
                        {p.medio_pago && <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{p.medio_pago}</span>}
                        {idx === 0 && <span className="text-xs bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded">último</span>}
                      </div>
                    </div>
                    <p className="text-emerald-400 font-medium">{formatPesos(p.monto)}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}