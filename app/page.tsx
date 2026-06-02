'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('cf_profes')
      .select('*')
      .eq('slug', slug.toLowerCase().trim())
      .eq('activo', true)
      .single()

    if (error || !data) {
      setError('No se encontró el profe. Revisá el usuario.')
      setLoading(false)
      return
    }

    if (data.password_hash !== password) {
      setError('Contraseña incorrecta.')
      setLoading(false)
      return
    }

    localStorage.setItem('cf_profe_id', data.id)
    localStorage.setItem('cf_profe_slug', data.slug)
    localStorage.setItem('cf_profe_nombre', data.nombre)
    router.push(`/${data.slug}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">CoachFlow</h1>
          <p className="text-zinc-400 mt-2 text-sm">Panel del entrenador</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Usuario</label>
            <input
              type="text"
              placeholder="tu-usuario"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          CoachFlow · Sistema para entrenadores
        </p>

      </div>
    </div>
  )
}