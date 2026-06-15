'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Pago {
  id: string
  alumno_id: string
  monto: number
  concepto: string
  fecha: string
  medio_pago: string
}

interface Alumno {
  id: string
  nombre: string
  telefono: string
}

const MEDIOS = ['efectivo', 'transferencia', 'mercadopago', 'otro']
const MEDIO_COLORS: Record<string, string> = {
  efectivo:      'bg-green-900/40 text-green-400',
  transferencia: 'bg-blue-900/40 text-blue-400',
  mercadopago:   'bg-cyan-900/40 text-cyan-400',
  otro:          'bg-zinc-800 text-zinc-400',
}

export default function PagosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [pagos, setPagos] = React.useState<Pago[]>([])
  const [alumnos, setAlumnos] = React.useState<Alumno[]>([])
  const [alumnosMap, setAlumnosMap] = React.useState<Record<string, Alumno>>({})
  const [loading, setLoading] = React.useState(true)
  const [mostrarForm, setMostrarForm] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)
  const [filtroAlumno, setFiltroAlumno] = React.useState('')
  const [editandoPago, setEditandoPago] = React.useState<string | null>(null)
  const [formEdit, setFormEdit] = React.useState({ monto: '', concepto: '', medio_pago: 'efectivo', fecha: '' })
  const [form, setForm] = React.useState({
    alumno_id: '', monto: '', concepto: '', medio_pago: 'efectivo',
    fecha: new Date().toISOString().split('T')[0],
  })

  React.useEffect(() => {
    const profeSlug = localStorage.getItem('cf_profe_slug')
    if (!profeSlug || profeSlug !== slug) { router.push('/'); return }
    cargarDatos()
  }, [slug])

  async function cargarDatos() {
    const profeId = localStorage.getItem('cf_profe_id')
    if (!profeId) return

    const { data: aData } = await supabase
      .from('cf_alumnos').select('id, nombre, telefono').eq('profe_id', profeId).order('nombre')

    setAlumnos(aData || [])
    const map: Record<string, Alumno> = {}
    ;(aData || []).forEach((a: Alumno) => { map[a.id] = a })
    setAlumnosMap(map)

    const { data: pData } = await supabase
      .from('cf_pagos').select('*').eq('profe_id', profeId).order('fecha', { ascending: false })

    setPagos(pData || [])
    setLoading(false)
  }

  async function guardarPago() {
    if (!form.alumno_id || !form.monto || !form.fecha) return
    setGuardando(true)
    const profeId = localStorage.getItem('cf_profe_id')
    const { error } = await supabase.from('cf_pagos').insert({
      profe_id: profeId,
      alumno_id: form.alumno_id,
      monto: Number(form.monto),
      concepto: form.concepto.trim() || 'Pago',
      medio_pago: form.medio_pago,
      fecha: form.fecha,
    })
    if (!error) {
      setForm({ alumno_id: '', monto: '', concepto: '', medio_pago: 'efectivo', fecha: new Date().toISOString().split('T')[0] })
      setMostrarForm(false)
      cargarDatos()
    }
    setGuardando(false)
  }

  async function guardarEdicion(pagoId: string) {
    if (!formEdit.monto) return
    setGuardando(true)
    const { error } = await supabase.from('cf_pagos').update({
      monto: Number(formEdit.monto),
      concepto: formEdit.concepto.trim() || 'Pago',
      medio_pago: formEdit.medio_pago,
      fecha: formEdit.fecha,
    }).eq('id', pagoId)
    if (!error) { setEditandoPago(null); cargarDatos() }
    setGuardando(false)
  }

  async function eliminarPago(pagoId: string) {
    if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) return
    await supabase.from('cf_pagos').delete().eq('id', pagoId)
    cargarDatos()
  }

  function abrirEditar(p: Pago) {
    if (editandoPago === p.id) { setEditandoPago(null); return }
    setEditandoPago(p.id)
    setFormEdit({ monto: String(p.monto), concepto: p.concepto || '', medio_pago: p.medio_pago, fecha: p.fecha })
  }

  const pagosFiltrados = filtroAlumno ? pagos.filter(p => p.alumno_id === filtroAlumno) : pagos

  const totalMes = (() => {
    const ahora = new Date()
    const mes = ahora.getMonth()
    const anio = ahora.getFullYear()
    return pagosFiltrados.filter(p => {
      const d = new Date(p.fecha)
      return d.getMonth() === mes && d.getFullYear() === anio
    }).reduce((acc, p) => acc + Number(p.monto), 0)
  })()

  const totalGeneral = pagosFiltrados.reduce((acc, p) => acc + Number(p.monto), 0)

  function formatMonto(n: number) { return '$' + n.toLocaleString('es-AR') }
  function formatFecha(fecha: string) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
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
          <span className="text-zinc-400 text-sm">Pagos</span>
        </div>
        <button onClick={() => router.push('/' + slug)} className="text-zinc-500 hover:text-white text-sm transition-colors">← Volver</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Pagos</h1>
            <p className="text-zinc-500 text-sm mt-1">{pagosFiltrados.length} registros</p>
          </div>
          <button onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Registrar pago
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1">Cobrado este mes</p>
            <p className="text-2xl font-semibold text-green-400">{formatMonto(totalMes)}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1">Total histórico</p>
            <p className="text-2xl font-semibold text-white">{formatMonto(totalGeneral)}</p>
          </div>
        </div>

        {mostrarForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">Registrar pago</h2>
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
                <label className="text-zinc-500 text-xs mb-1 block">Monto *</label>
                <input type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="15000" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Medio de pago</label>
                <select value={form.medio_pago} onChange={e => setForm({ ...form, medio_pago: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none">
                  {MEDIOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Concepto</label>
                <input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" placeholder="Cuota junio, sesión, etc." />
              </div>
              <div>
                <label className="text-zinc-500 text-xs mb-1 block">Fecha *</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={guardarPago} disabled={guardando || !form.alumno_id || !form.monto}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar pago'}
              </button>
              <button onClick={() => setMostrarForm(false)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <select value={filtroAlumno} onChange={e => setFiltroAlumno(e.target.value)}
            className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none">
            <option value="">Todos los alumnos</option>
            {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          {pagosFiltrados.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-zinc-500 text-sm">Sin pagos registrados todavía.</p>
            </div>
          ) : (
            pagosFiltrados.map(p => {
              const alumno = alumnosMap[p.alumno_id]
              return (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <p className="text-green-400 font-semibold text-sm min-w-[72px]">{formatMonto(p.monto)}</p>
                      <div>
                        <p className="text-sm font-medium text-white">{alumno?.nombre || '—'}</p>
                        <p className="text-xs text-zinc-500">{p.concepto || 'Pago'} · {formatFecha(p.fecha)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${MEDIO_COLORS[p.medio_pago] || 'bg-zinc-800 text-zinc-400'}`}>
                        {p.medio_pago}
                      </span>
                      <button onClick={() => abrirEditar(p)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${editandoPago === p.id ? 'text-violet-300 border-violet-700' : 'text-zinc-400 hover:text-white border-zinc-700'}`}>
                        ✏️
                      </button>
                      <button onClick={() => eliminarPago(p.id)}
                        className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded border border-zinc-700 hover:border-red-800 transition-colors">
                        ✕
                      </button>
                    </div>
                  </div>

                  {editandoPago === p.id && (
                    <div className="border-t border-zinc-800 p-4 bg-zinc-800/50 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Monto</label>
                          <input type="number" value={formEdit.monto} onChange={e => setFormEdit({ ...formEdit, monto: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Medio de pago</label>
                          <select value={formEdit.medio_pago} onChange={e => setFormEdit({ ...formEdit, medio_pago: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none">
                            {MEDIOS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Concepto</label>
                          <input type="text" value={formEdit.concepto} onChange={e => setFormEdit({ ...formEdit, concepto: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Fecha</label>
                          <input type="date" value={formEdit.fecha} onChange={e => setFormEdit({ ...formEdit, fecha: e.target.value })}
                            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => guardarEdicion(p.id)} disabled={guardando}
                          className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                          {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button onClick={() => setEditandoPago(null)} className="text-zinc-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
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