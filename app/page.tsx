'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Vista = 'login' | 'registro'

const DEPORTES = [
  'Fitness / Gym',
  'Tenis',
  'Pádel',
  'Natación',
  'Patinaje',
  'Yoga / Pilates',
  'Artes marciales',
  'Running / Atletismo',
  'Fútbol',
  'Básquet',
  'Otro',
]

export default function LoginPage() {
  const router = useRouter()
  const [vista, setVista] = useState<Vista>('login')

  // Login
  const [slug, setSlug] = useState('')
  const [password, setPassword] = useState('')
  const [errorLogin, setErrorLogin] = useState('')
  const [loadingLogin, setLoadingLogin] = useState(false)

  // Registro
  const [regNombre, setRegNombre] = useState('')
  const [regDeporte, setRegDeporte] = useState('Fitness / Gym')
  const [regSlug, setRegSlug] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regTelefono, setRegTelefono] = useState('')
  const [errorReg, setErrorReg] = useState('')
  const [loadingReg, setLoadingReg] = useState(false)
  const [registroOk, setRegistroOk] = useState(false)

  async function handleLogin() {
    setLoadingLogin(true)
    setErrorLogin('')

    const { data, error } = await supabase
      .from('cf_profes')
      .select('*')
      .eq('slug', slug.toLowerCase().trim())
      .single()

    if (error || !data) {
      setErrorLogin('No se encontró el usuario. Revisá el nombre de usuario.')
      setLoadingLogin(false)
      return
    }

    if (!data.activo) {
      setErrorLogin('Tu cuenta está pendiente de activación. Contactá al administrador.')
      setLoadingLogin(false)
      return
    }

    if (data.password_hash !== password) {
      setErrorLogin('Contraseña incorrecta.')
      setLoadingLogin(false)
      return
    }

    localStorage.setItem('cf_profe_id', data.id)
    localStorage.setItem('cf_profe_slug', data.slug)
    localStorage.setItem('cf_profe_nombre', data.nombre)
    router.push('/' + data.slug)
  }

  function slugify(texto: string) {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNombreChange(valor: string) {
    setRegNombre(valor)
    setRegSlug(slugify(valor))
  }

  async function handleRegistro() {
    setErrorReg('')

    if (!regNombre.trim()) { setErrorReg('El nombre es obligatorio.'); return }
    if (!regSlug.trim()) { setErrorReg('El usuario es obligatorio.'); return }
    if (regPassword.length < 6) { setErrorReg('La contraseña debe tener al menos 6 caracteres.'); return }
    if (regPassword !== regPassword2) { setErrorReg('Las contraseñas no coinciden.'); return }

    setLoadingReg(true)

    const { data: existente } = await supabase
      .from('cf_profes')
      .select('id')
      .eq('slug', regSlug.toLowerCase().trim())
      .single()

    if (existente) {
      setErrorReg('Ese nombre de usuario ya está en uso. Probá con otro.')
      setLoadingReg(false)
      return
    }

    const { error } = await supabase.from('cf_profes').insert({
      nombre: regNombre.trim(),
      slug: regSlug.toLowerCase().trim(),
      password_hash: regPassword,
      deporte: regDeporte,
      email: regEmail.trim() || null,
      telefono: regTelefono.trim() || null,
    })

    if (error) {
      setErrorReg('Error al crear la cuenta. Intentá de nuevo.')
      setLoadingReg(false)
      return
    }

    setRegistroOk(true)
    setLoadingReg(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">CoachFlow</h1>
          <p className="text-zinc-400 mt-2 text-sm">Sistema para entrenadores independientes</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 mb-6">
          <button onClick={() => { setVista('login'); setErrorReg(''); setRegistroOk(false) }}
            className={'flex-1 py-2 rounded-lg text-sm font-medium transition-colors ' + (vista === 'login' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white')}>
            Ingresar
          </button>
          <button onClick={() => { setVista('registro'); setErrorLogin('') }}
            className={'flex-1 py-2 rounded-lg text-sm font-medium transition-colors ' + (vista === 'registro' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white')}>
            Registrarse
          </button>
        </div>

        {/* LOGIN */}
        {vista === 'login' && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Usuario</label>
              <input type="text" placeholder="tu-usuario" value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Contraseña</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
            </div>
            {errorLogin && <p className="text-red-400 text-sm">{errorLogin}</p>}
            <button onClick={handleLogin} disabled={loadingLogin}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg text-sm transition-colors disabled:opacity-50">
              {loadingLogin ? 'Ingresando...' : 'Ingresar'}
            </button>
            <p className="text-center text-zinc-600 text-xs">
              ¿No tenés cuenta?{' '}
              <button onClick={() => setVista('registro')} className="text-violet-400 hover:text-violet-300">
                Registrate gratis
              </button>
            </p>
          </div>
        )}

        {/* REGISTRO */}
        {vista === 'registro' && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">

            {registroOk ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-violet-900/40 flex items-center justify-center mx-auto">
                  <span className="text-3xl">✓</span>
                </div>
                <div>
                  <p className="text-white font-medium text-lg">¡Cuenta creada!</p>
                  <p className="text-zinc-400 text-sm mt-1">Tu usuario es <span className="text-violet-400 font-medium">{regSlug}</span></p>
                </div>
                <button onClick={() => router.push('/onboarding')}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg text-sm transition-colors">
                  Ver cómo funciona →
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Tu nombre *</label>
                  <input type="text" placeholder="Juan Pérez" value={regNombre}
                    onChange={e => handleNombreChange(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Tu deporte / disciplina *</label>
                  <select value={regDeporte} onChange={e => setRegDeporte(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500">
                    {DEPORTES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">
                    Nombre de usuario *
                    <span className="text-zinc-600 ml-1 font-normal">(se usa para ingresar)</span>
                  </label>
                  <div className="relative">
                    <input type="text" value={regSlug}
                      onChange={e => setRegSlug(slugify(e.target.value))}
                      className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500 pr-24" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">coachflow/{regSlug}</span>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Contraseña * <span className="text-zinc-600 font-normal">(mínimo 6 caracteres)</span></label>
                  <input type="password" placeholder="••••••••" value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Repetir contraseña *</label>
                  <input type="password" placeholder="••••••••" value={regPassword2}
                    onChange={e => setRegPassword2(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Email <span className="text-zinc-600 font-normal">(opcional)</span></label>
                  <input type="email" placeholder="juan@email.com" value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Teléfono / WhatsApp <span className="text-zinc-600 font-normal">(opcional)</span></label>
                  <input type="text" placeholder="3815123456" value={regTelefono}
                    onChange={e => setRegTelefono(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500" />
                </div>

                {errorReg && <p className="text-red-400 text-sm">{errorReg}</p>}

                <button onClick={handleRegistro} disabled={loadingReg}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-lg text-sm transition-colors disabled:opacity-50">
                  {loadingReg ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                </button>

                <p className="text-center text-zinc-600 text-xs">
                  ¿Ya tenés cuenta?{' '}
                  <button onClick={() => setVista('login')} className="text-violet-400 hover:text-violet-300">
                    Ingresá acá
                  </button>
                </p>
              </>
            )}
          </div>
        )}

        <p className="text-center text-zinc-700 text-xs mt-6">
          CoachFlow · Sistema para entrenadores independientes
        </p>

      </div>
    </div>
  )
}
