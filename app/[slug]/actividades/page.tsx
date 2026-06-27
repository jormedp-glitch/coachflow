'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Ejercicio {
  id: string
  nombre: string
  grupo_muscular: string
  url_video: string
  es_global: boolean
  profe_id: string | null
}

export default function ActividadesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [ejercicios, setEjercicios] = React.useState<Ejercicio[]>([])
  const [loading, setLoading] = React.useState(true)
  const [mostrarForm, setMostrarForm] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [editando, setEditando] = React.useState<string | null>(null)
  const [filtro, setFiltro] = React.useState('')
  const [filtroCat, setFiltroCat] = React.useState('')
  const [form, setForm] = React.useState({ nombre: '', grupo_muscular: '', url_video: '' })
  const [formEdit, setFormEdit] = React.useState({ nombre: '', grupo_muscular: '', url_video: '' })

  React.useEffect(() => {
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) { router.push('/'); return }
    cargarDatos()
  }, [slug])

  async function cargarDatos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return

    const { data } = await supabase
      .from('cf_ejercicios')
      .select('*')
      .or('profe_id.eq.' + profeId + ',es_global.eq.true')
      .order('grupo_muscular')
      .order('nombre')

    setEjercicios(data || [])
    setLoading(false)
  }

  async function guardarActividad() {
    if (!form.nombre.trim()) return
    setGuardando(true)
    const profeId = localStorage.getItem('cf_profe_id')
    const { error } = await supabase.from('cf_ejercicios').insert({
      nombre: form.nombre.trim(),
      grupo_muscular: form.grupo_muscular.trim(),
      url_video: form.url_video.trim(),
      profe_id: profeId,
      es_global: false
    })
    if (!error) {
      setForm({ nombre: '', grupo_muscular: '', url_video: '' })
      setMostrarForm(false)
      cargarDatos()
    }
    setGuardando(false)
  }

  async function guardarEdicion(ejId: string) {
    if (!formEdit.nombre.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('cf_ejercicios').update({
      nombre: formEdit.nombre.trim(),
      grupo_muscular: formEdit.grupo_muscular.trim(),
      url_video: formEdit.url_video.trim()
    }).eq('id', ejId)
    if (!error) { setEditando(null); cargarDatos() }
    setGuardando(false)
  }

  async function eliminarActividad(ejId: string) {
    if (!confirm('¿Eliminar esta actividad? Si está usada en algún plan, se eliminará de ahí también.')) return
    await supabase.from('cf_ejercicios').delete().eq('id', ejId)
    cargarDatos()
  }

  function abrirEditar(ej: Ejercicio) {
    if (editando === ej.id) { setEditando(null); return }
    setEditando(ej.id)
    setFormEdit({ nombre: ej.nombre, grupo_muscular: ej.grupo_muscular || '', url_video: ej.url_video || '' })
  }

  // Categorías únicas para el filtro
  const categorias = Array.from(new Set(ejercicios.map(e => e.grupo_muscular).filter(Boolean))).sort()

  // Filtrar ejercicios
  const ejerciciosFiltrados = ejercicios.filter(e => {
    const matchTexto = !filtro || e.nombre.toLowerCase().includes(filtro.toLowerCase()) || (e.grupo_muscular || '').toLowerCase().includes(filtro.toLowerCase())
    const matchCat = !filtroCat || e.grupo_muscular === filtroCat
    return matchTexto && matchCat
  })

  const propias = ejerciciosFiltrados.filter(e => !e.es_global)
  const globales = ejerciciosFiltrados.filter(e => e.es_global)

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
          <span className="text-zinc-400 text-sm">Actividades</span>
        </div>
        <button onClick={() => router.push('/' + slug)} className="text-zinc-500 hover:text-white text-sm transition-colors">← Volver</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Actividades</h1>
            <p className="text-zinc-500 text-sm mt-1">{ejercicios.length} en total · {propias.length + globales.length - ejercicios.length === 0 ? '' : ''}{ejercicios.filter(e => !e.es_global).length} propias · {ejercicios.filter(e => e.es_global).length} predefinidas</p>
          </div>
          <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null) }}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nueva actividad
          </button>
        </div>

        {/* Formulario nueva actividad */}
        {mostrarForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">Nueva actividad</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="Sentadilla búlgara" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Categoría</label>
                <input type="text" value={form.grupo_muscular} onChange={e => setForm({ ...form, grupo_muscular: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="Piernas, Cardio, Técnica..." />
              </div>
              <div className="col-span-2">
                <label className="text-zinc-500 text-xs mb-1 block">URL de video (opcional)</label>
                <input type="url" value={form.url_video} onChange={e => setForm({ ...form, url_video: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" placeholder="https://youtube.com/watch?v=..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={guardarActividad} disabled={guardando || !form.nombre.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar actividad'}
              </button>
              <button onClick={() => setMostrarForm(false)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <input type="text" value={filtro} onChange={e => setFiltro(e.target.value)}
            className="flex-1 bg-zinc-900 text-white rounded-lg px-3 py-2 text-sm border border-zinc-800 focus:outline-none focus:border-zinc-600" placeholder="Buscar actividad..." />
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
            className="bg-zinc-900 text-white rounded-lg px-3 py-2 text-sm border border-zinc-800 focus:outline-none">
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Actividades propias */}
        {propias.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Mis actividades ({propias.length})</h2>
            <div className="space-y-1">
              {propias.map(ej => (
                <div key={ej.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{ej.nombre}</p>
                        <p className="text-xs text-zinc-500">{ej.grupo_muscular || 'Sin categoría'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ej.url_video && (
                        <a href={ej.url_video} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-zinc-700 transition-colors">Video</a>
                      )}
                      <button onClick={() => abrirEditar(ej)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${editando === ej.id ? 'text-violet-300 border-violet-700' : 'text-zinc-400 hover:text-white border-zinc-700'}`}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminarActividad(ej.id)}
                        className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 hover:border-red-800 transition-colors">✕</button>
                    </div>
                  </div>

                  {editando === ej.id && (
                    <div className="border-t border-zinc-800 p-3 bg-zinc-800/50 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Nombre *</label>
                          <input type="text" value={formEdit.nombre} onChange={e => setFormEdit({ ...formEdit, nombre: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Categoría</label>
                          <input type="text" value={formEdit.grupo_muscular} onChange={e => setFormEdit({ ...formEdit, grupo_muscular: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-zinc-500 text-xs mb-1 block">URL de video</label>
                          <input type="url" value={formEdit.url_video} onChange={e => setFormEdit({ ...formEdit, url_video: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => guardarEdicion(ej.id)} disabled={guardando}
                          className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                          {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button onClick={() => setEditando(null)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actividades globales */}
        {globales.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Predefinidas ({globales.length})</h2>
            <div className="space-y-1">
              {globales.map(ej => (
                <div key={ej.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{ej.nombre}</p>
                    <p className="text-xs text-zinc-500">{ej.grupo_muscular || 'Sin categoría'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ej.url_video && (
                      <a href={ej.url_video} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-zinc-700 transition-colors">Video</a>
                    )}
                    <span className="text-xs text-zinc-600 px-2 py-1">Global</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ejerciciosFiltrados.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">{filtro || filtroCat ? 'Sin resultados para este filtro' : 'Todavía no hay actividades. ¡Creá la primera!'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
