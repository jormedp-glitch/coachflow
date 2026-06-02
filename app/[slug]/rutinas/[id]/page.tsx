'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Ejercicio {
  id: string
  nombre: string
  grupo_muscular: string
  url_video: string
}

interface EjercicioRutina {
  id: string
  ejercicio_id: string
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

export default function RutinaDetallePage({ params }: { params: Promise<{ slug: string, id: string }> }) {
  const { slug, id } = React.use(params)
  const router = useRouter()
  const [rutinaNombre, setRutinaNombre] = React.useState('')
  const [semanasTotal, setSemanasTotal] = React.useState(4)
  const [semanas, setSemanas] = React.useState<Semana[]>([])
  const [ejerciciosBiblioteca, setEjerciciosBiblioteca] = React.useState<Ejercicio[]>([])
  const [loading, setLoading] = React.useState(true)
  const [semanaActiva, setSemanaActiva] = React.useState(1)
  const [mostrarSelector, setMostrarSelector] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [formEj, setFormEj] = React.useState({
    ejercicio_id: '',
    series: 3,
    repeticiones: '10',
    descanso_seg: 60,
    notas: ''
  })

  React.useEffect(() => {
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) { router.push('/'); return }
    cargarDatos()
  }, [slug, id])

  async function cargarDatos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return

    const { data: rutina } = await supabase
      .from('cf_rutinas')
      .select('*')
      .eq('id', id)
      .single()

    if (!rutina) { router.push('/' + slug + '/rutinas'); return }
    setRutinaNombre(rutina.nombre)
    setSemanasTotal(rutina.semanas_total)

    const { data: semanasData } = await supabase
      .from('cf_rutina_semanas')
      .select('*')
      .eq('rutina_id', id)
      .order('numero_semana')

    const { data: ejerciciosData } = await supabase
      .from('cf_rutina_ejercicios')
      .select('*, ejercicio:cf_ejercicios(*)')
      .in('semana_id', semanasData?.map(s => s.id) || [])
      .order('orden')

    const { data: biblioteca } = await supabase
      .from('cf_ejercicios')
      .select('*')
      .eq('profe_id', profeId)
      .order('nombre')

    const semanasConEj: Semana[] = Array.from({ length: rutina.semanas_total }, (_, i) => {
      const semana = semanasData?.find(s => s.numero_semana === i + 1)
      return {
        id: semana?.id || '',
        numero_semana: i + 1,
        ejercicios: semana ? (ejerciciosData?.filter(e => e.semana_id === semana.id) || []) : []
      }
    })

    setSemanas(semanasConEj)
    setEjerciciosBiblioteca(biblioteca || [])
    setLoading(false)
  }

  async function asegurarSemana(numeroSemana: number): Promise<string> {
    const semana = semanas.find(s => s.numero_semana === numeroSemana)
    if (semana?.id) return semana.id
    const { data } = await supabase
      .from('cf_rutina_semanas')
      .insert({ rutina_id: id, numero_semana: numeroSemana })
      .select()
      .single()
    return data?.id || ''
  }

  async function agregarEjercicio() {
    if (!formEj.ejercicio_id) return
    setGuardando(true)
    const semanaId = await asegurarSemana(semanaActiva)
    if (!semanaId) { setGuardando(false); return }
    const semanaEjercicios = semanas.find(s => s.numero_semana === semanaActiva)?.ejercicios || []
    await supabase.from('cf_rutina_ejercicios').insert({
      semana_id: semanaId,
      ejercicio_id: formEj.ejercicio_id,
      series: formEj.series,
      repeticiones: formEj.repeticiones,
      descanso_seg: formEj.descanso_seg,
      notas: formEj.notas,
      orden: semanaEjercicios.length
    })
    setFormEj({ ejercicio_id: '', series: 3, repeticiones: '10', descanso_seg: 60, notas: '' })
    setMostrarSelector(false)
    await cargarDatos()
    setGuardando(false)
  }

  async function eliminarEjercicio(ejercicioId: string) {
    await supabase.from('cf_rutina_ejercicios').delete().eq('id', ejercicioId)
    cargarDatos()
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-400">Cargando...</p>
    </div>
  )

  const semanaActual = semanas.find(s => s.numero_semana === semanaActiva)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/' + slug + '/rutinas')} className="text-violet-400 font-bold text-lg">CoachFlow</button>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 text-sm">{rutinaNombre}</span>
        </div>
        <button onClick={() => router.push('/' + slug + '/rutinas')} className="text-zinc-500 hover:text-white text-sm transition-colors">← Volver</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{rutinaNombre}</h1>
          <p className="text-zinc-500 text-sm mt-1">{semanasTotal} semanas · Click en una semana para editarla</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {semanas.map(s => (
            <button
              key={s.numero_semana}
              onClick={() => setSemanaActiva(s.numero_semana)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${semanaActiva === s.numero_semana ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              Semana {s.numero_semana}
              {s.ejercicios.length > 0 && (
                <span className="ml-2 text-xs opacity-70">({s.ejercicios.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-300">Semana {semanaActiva}</h2>
            <button
              onClick={() => setMostrarSelector(!mostrarSelector)}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              + Agregar ejercicio
            </button>
          </div>

          {mostrarSelector && (
            <div className="bg-zinc-800 rounded-xl p-4 mb-4 space-y-3">
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Ejercicio de la biblioteca</label>
                <select
                  value={formEj.ejercicio_id}
                  onChange={e => setFormEj({ ...formEj, ejercicio_id: e.target.value })}
                  className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none"
                >
                  <option value="">Seleccionar ejercicio...</option>
                  {ejerciciosBiblioteca.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.grupo_muscular ? '· ' + e.grupo_muscular : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Series</label>
                  <input
                    type="number"
                    value={formEj.series}
                    onChange={e => setFormEj({ ...formEj, series: Number(e.target.value) })}
                    className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none"
                    min={1} max={10}
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Repeticiones</label>
                  <input
                    type="text"
                    value={formEj.repeticiones}
                    onChange={e => setFormEj({ ...formEj, repeticiones: e.target.value })}
                    className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none"
                    placeholder="10 o 8-12"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Descanso (seg)</label>
                  <input
                    type="number"
                    value={formEj.descanso_seg}
                    onChange={e => setFormEj({ ...formEj, descanso_seg: Number(e.target.value) })}
                    className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none"
                    min={0} step={15}
                  />
                </div>
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Notas</label>
                <input
                  type="text"
                  value={formEj.notas}
                  onChange={e => setFormEj({ ...formEj, notas: e.target.value })}
                  className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none"
                  placeholder="Peso sugerido, tecnica especial..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={agregarEjercicio} disabled={guardando || !formEj.ejercicio_id} className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {guardando ? 'Agregando...' : 'Agregar'}
                </button>
                <button onClick={() => setMostrarSelector(false)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!semanaActual || semanaActual.ejercicios.length === 0 ? (
            <p className="text-zinc-600 text-sm">Sin ejercicios en esta semana. Agrega el primero!</p>
          ) : (
            <div className="space-y-2">
              {semanaActual.ejercicios.map((ej, idx) => (
                <div key={ej.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-600 text-xs w-5">{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{ej.ejercicio?.nombre}</p>
                      <p className="text-xs text-zinc-500">
                        {ej.series} series · {ej.repeticiones} reps · {ej.descanso_seg}s descanso
                        {ej.notas && ' · ' + ej.notas}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ej.ejercicio?.url_video && (
                      <a href={ej.ejercicio.url_video} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300">
                        Video
                      </a>
                    )}
                    <button onClick={() => eliminarEjercicio(ej.id)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}