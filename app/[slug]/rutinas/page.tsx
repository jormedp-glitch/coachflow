'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Rutina {
  id: string
  nombre: string
  descripcion: string
  semanas_total: number
  activo: boolean
}

interface Ejercicio {
  id: string
  nombre: string
  grupo_muscular: string
  url_video: string
  descripcion: string
}

export default function RutinasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [rutinas, setRutinas] = React.useState<Rutina[]>([])
  const [ejercicios, setEjercicios] = React.useState<Ejercicio[]>([])
  const [loading, setLoading] = React.useState(true)
  const [vista, setVista] = React.useState<'rutinas' | 'ejercicios'>('rutinas')
  const [mostrarFormRutina, setMostrarFormRutina] = React.useState(false)
  const [mostrarFormEjercicio, setMostrarFormEjercicio] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [editandoRutina, setEditandoRutina] = React.useState<string | null>(null)
  const [editandoEjercicio, setEditandoEjercicio] = React.useState<string | null>(null)
  const [formRutina, setFormRutina] = React.useState({ nombre: '', descripcion: '', semanas_total: 4 })
  const [formEjercicio, setFormEjercicio] = React.useState({ nombre: '', grupo_muscular: '', url_video: '', descripcion: '' })
  const [formEditRutina, setFormEditRutina] = React.useState({ nombre: '', descripcion: '', semanas_total: 4 })
  const [formEditEjercicio, setFormEditEjercicio] = React.useState({ nombre: '', grupo_muscular: '', url_video: '', descripcion: '' })

  React.useEffect(() => {
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) { router.push('/'); return }
    cargarDatos()
  }, [slug])

  async function cargarDatos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return
    const [{ data: r }, { data: e }] = await Promise.all([
      supabase.from('cf_rutinas').select('*').eq('profe_id', profeId).order('created_at', { ascending: false }),
      supabase.from('cf_ejercicios').select('*').eq('profe_id', profeId).order('nombre')
    ])
    setRutinas(r || [])
    setEjercicios(e || [])
    setLoading(false)
  }

  async function guardarRutina() {
    if (!formRutina.nombre.trim()) return
    setGuardando(true)
    const profeId = localStorage.getItem('cf_profe_id')
    const { error } = await supabase.from('cf_rutinas').insert({
      profe_id: profeId, nombre: formRutina.nombre.trim(),
      descripcion: formRutina.descripcion.trim(), semanas_total: formRutina.semanas_total, activo: true
    })
    if (!error) { setFormRutina({ nombre: '', descripcion: '', semanas_total: 4 }); setMostrarFormRutina(false); cargarDatos() }
    setGuardando(false)
  }

  async function guardarEdicionRutina(id: string) {
    if (!formEditRutina.nombre.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('cf_rutinas').update({
      nombre: formEditRutina.nombre.trim(),
      descripcion: formEditRutina.descripcion.trim(),
      semanas_total: formEditRutina.semanas_total
    }).eq('id', id)
    if (!error) { setEditandoRutina(null); cargarDatos() }
    setGuardando(false)
  }

  async function eliminarRutina(id: string) {
    if (!confirm('¿Eliminar esta rutina? Se perderán todos sus ejercicios.')) return
    await supabase.from('cf_rutinas').delete().eq('id', id)
    cargarDatos()
  }

  async function guardarEjercicio() {
    if (!formEjercicio.nombre.trim()) return
    setGuardando(true)
    const profeId = localStorage.getItem('cf_profe_id')
    const { error } = await supabase.from('cf_ejercicios').insert({
      profe_id: profeId, nombre: formEjercicio.nombre.trim(),
      grupo_muscular: formEjercicio.grupo_muscular.trim(),
      url_video: formEjercicio.url_video.trim(),
      descripcion: formEjercicio.descripcion.trim(), activo: true
    })
    if (!error) { setFormEjercicio({ nombre: '', grupo_muscular: '', url_video: '', descripcion: '' }); setMostrarFormEjercicio(false); cargarDatos() }
    setGuardando(false)
  }

  async function guardarEdicionEjercicio(id: string) {
    if (!formEditEjercicio.nombre.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('cf_ejercicios').update({
      nombre: formEditEjercicio.nombre.trim(),
      grupo_muscular: formEditEjercicio.grupo_muscular.trim(),
      url_video: formEditEjercicio.url_video.trim(),
      descripcion: formEditEjercicio.descripcion.trim()
    }).eq('id', id)
    if (!error) { setEditandoEjercicio(null); cargarDatos() }
    setGuardando(false)
  }

  async function eliminarEjercicio(id: string) {
    if (!confirm('¿Eliminar este ejercicio de la biblioteca?')) return
    await supabase.from('cf_ejercicios').delete().eq('id', id)
    cargarDatos()
  }

  function abrirEditarRutina(r: Rutina) {
    if (editandoRutina === r.id) { setEditandoRutina(null); return }
    setEditandoRutina(r.id)
    setFormEditRutina({ nombre: r.nombre, descripcion: r.descripcion || '', semanas_total: r.semanas_total })
  }

  function abrirEditarEjercicio(e: Ejercicio) {
    if (editandoEjercicio === e.id) { setEditandoEjercicio(null); return }
    setEditandoEjercicio(e.id)
    setFormEditEjercicio({ nombre: e.nombre, grupo_muscular: e.grupo_muscular || '', url_video: e.url_video || '', descripcion: e.descripcion || '' })
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
          <span className="text-zinc-400 text-sm">Rutinas</span>
        </div>
        <button onClick={() => router.push('/' + slug)} className="text-zinc-500 hover:text-white text-sm transition-colors">← Volver</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setVista('rutinas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vista === 'rutinas' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            Planes de rutina ({rutinas.length})
          </button>
          <button onClick={() => setVista('ejercicios')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vista === 'ejercicios' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            Biblioteca de ejercicios ({ejercicios.length})
          </button>
        </div>

        {vista === 'rutinas' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Planes de rutina</h1>
              <button onClick={() => setMostrarFormRutina(!mostrarFormRutina)}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                + Nueva rutina
              </button>
            </div>

            {mostrarFormRutina && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 space-y-4">
                <h2 className="text-sm font-medium text-zinc-300">Nueva rutina</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                    <input type="text" value={formRutina.nombre} onChange={e => setFormRutina({ ...formRutina, nombre: e.target.value })}
                      className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="Fuerza 3 sesiones" />
                  </div>
                  <div>
                    {/* CAMBIO: Cantidad de semanas → Cantidad de sesiones */}
                    <label className="text-zinc-500 text-xs mb-1 block">Cantidad de sesiones</label>
                    <select value={formRutina.semanas_total} onChange={e => setFormRutina({ ...formRutina, semanas_total: Number(e.target.value) })}
                      className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none">
                      {/* CAMBIO: semanas → sesiones en las opciones */}
                      {[2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} sesiones</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Descripcion</label>
                  <input type="text" value={formRutina.descripcion} onChange={e => setFormRutina({ ...formRutina, descripcion: e.target.value })}
                    className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="Para quien es esta rutina..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={guardarRutina} disabled={guardando} className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                    {guardando ? 'Guardando...' : 'Guardar rutina'}
                  </button>
                  <button onClick={() => setMostrarFormRutina(false)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {rutinas.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                  <p className="text-zinc-500 text-sm">Sin rutinas todavia. Crea la primera!</p>
                </div>
              ) : (
                rutinas.map(r => (
                  <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{r.nombre}</p>
                        {/* CAMBIO: semanas → sesiones en la card */}
                        <p className="text-xs text-zinc-500">{r.semanas_total} sesiones · {r.descripcion || 'Sin descripcion'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/' + slug + '/rutinas/' + r.id)}
                          className="text-xs text-violet-400 hover:text-violet-300 px-3 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
                          Ver sesiones →
                        </button>
                        <button onClick={() => abrirEditarRutina(r)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${editandoRutina === r.id ? 'text-violet-300 border-violet-700' : 'text-zinc-400 hover:text-white border-zinc-700'}`}>
                          ✏️
                        </button>
                        <button onClick={() => eliminarRutina(r.id)}
                          className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 hover:border-red-800 transition-colors">
                          ✕
                        </button>
                      </div>
                    </div>

                    {editandoRutina === r.id && (
                      <div className="border-t border-zinc-800 p-4 bg-zinc-800/50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                            <input type="text" value={formEditRutina.nombre} onChange={e => setFormEditRutina({ ...formEditRutina, nombre: e.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                          </div>
                          <div>
                            {/* CAMBIO: Semanas → Sesiones en el form de edición */}
                            <label className="text-zinc-500 text-xs mb-1 block">Sesiones</label>
                            <select value={formEditRutina.semanas_total} onChange={e => setFormEditRutina({ ...formEditRutina, semanas_total: Number(e.target.value) })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none">
                              {[2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} sesiones</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-zinc-500 text-xs mb-1 block">Descripcion</label>
                            <input type="text" value={formEditRutina.descripcion} onChange={e => setFormEditRutina({ ...formEditRutina, descripcion: e.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => guardarEdicionRutina(r.id)} disabled={guardando}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                          <button onClick={() => setEditandoRutina(null)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {vista === 'ejercicios' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Biblioteca de ejercicios</h1>
              <button onClick={() => setMostrarFormEjercicio(!mostrarFormEjercicio)}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                + Nuevo ejercicio
              </button>
            </div>

            {mostrarFormEjercicio && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 space-y-4">
                <h2 className="text-sm font-medium text-zinc-300">Nuevo ejercicio</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                    <input type="text" value={formEjercicio.nombre} onChange={e => setFormEjercicio({ ...formEjercicio, nombre: e.target.value })}
                      className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="Sentadilla" />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs mb-1 block">Grupo muscular</label>
                    <input type="text" value={formEjercicio.grupo_muscular} onChange={e => setFormEjercicio({ ...formEjercicio, grupo_muscular: e.target.value })}
                      className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="Piernas, Core, Pecho..." />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Video de YouTube (URL)</label>
                  <input type="text" value={formEjercicio.url_video} onChange={e => setFormEjercicio({ ...formEjercicio, url_video: e.target.value })}
                    className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Descripcion / instrucciones</label>
                  <textarea value={formEjercicio.descripcion} onChange={e => setFormEjercicio({ ...formEjercicio, descripcion: e.target.value })}
                    className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" rows={2} placeholder="Tecnica, puntos clave..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={guardarEjercicio} disabled={guardando} className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                    {guardando ? 'Guardando...' : 'Guardar ejercicio'}
                  </button>
                  <button onClick={() => setMostrarFormEjercicio(false)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {ejercicios.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                  <p className="text-zinc-500 text-sm">Sin ejercicios todavia. Agrega el primero a tu biblioteca!</p>
                </div>
              ) : (
                ejercicios.map(e => (
                  <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{e.nombre}</p>
                        <p className="text-xs text-zinc-500">{e.grupo_muscular || 'Sin grupo muscular'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.url_video && (
                          <a href={e.url_video} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
                            Ver video
                          </a>
                        )}
                        <button onClick={() => abrirEditarEjercicio(e)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${editandoEjercicio === e.id ? 'text-violet-300 border-violet-700' : 'text-zinc-400 hover:text-white border-zinc-700'}`}>
                          ✏️
                        </button>
                        <button onClick={() => eliminarEjercicio(e.id)}
                          className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 hover:border-red-800 transition-colors">
                          ✕
                        </button>
                      </div>
                    </div>

                    {editandoEjercicio === e.id && (
                      <div className="border-t border-zinc-800 p-4 bg-zinc-800/50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                            <input type="text" value={formEditEjercicio.nombre} onChange={ev => setFormEditEjercicio({ ...formEditEjercicio, nombre: ev.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-zinc-500 text-xs mb-1 block">Grupo muscular</label>
                            <input type="text" value={formEditEjercicio.grupo_muscular} onChange={ev => setFormEditEjercicio({ ...formEditEjercicio, grupo_muscular: ev.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-zinc-500 text-xs mb-1 block">Video YouTube</label>
                            <input type="text" value={formEditEjercicio.url_video} onChange={ev => setFormEditEjercicio({ ...formEditEjercicio, url_video: ev.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-zinc-500 text-xs mb-1 block">Descripcion</label>
                            <textarea value={formEditEjercicio.descripcion} onChange={ev => setFormEditEjercicio({ ...formEditEjercicio, descripcion: ev.target.value })}
                              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" rows={2} />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => guardarEdicionEjercicio(e.id)} disabled={guardando}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                          <button onClick={() => setEditandoEjercicio(null)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                        </div>
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
