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

export default function PortalAlumnoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = React.use(params)
  const [alumno, setAlumno] = React.useState<Alumno | null>(null)
  const [asignacion, setAsignacion] = React.useState<Asignacion | null>(null)
  const [semanas, setSemanas] = React.useState<Semana[]>([])
  const [semanaVista, setSemanaVista] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [noEncontrado, setNoEncontrado] = React.useState(false)

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
      .eq('activa', true)
      .single()

    if (!asignacionData) { setLoading(false); return }
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
    setLoading(false)
  }

  function getYoutubeId(url: string) {
    const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
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
            </div>

            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {Array.from({ length: asignacion.rutina.semanas_total }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setSemanaVista(n)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${semanaVista === n ? 'bg-violet-600 text-white' : n === asignacion.semana_actual ? 'bg-zinc-700 text-violet-300 border border-violet-700' : 'bg-zinc-800 text-zinc-400'}`}
                >
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
                semanaActual.ejercicios.map((ej, idx) => (
                  <div key={ej.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-zinc-600 text-xs">{idx + 1}</span>
                            <p className="text-white font-medium text-sm">{ej.ejercicio?.nombre}</p>
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
                          {ej.notas && (
                            <p className="text-zinc-500 text-xs mt-2 italic">{ej.notas}</p>
                          )}
                        </div>
                        {ej.ejercicio?.url_video && (
                          <a
                            href={ej.ejercicio.url_video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                          >
                            Ver video
                          </a>
                        )}
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
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}