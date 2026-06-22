'use client'
import React from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [paso, setPaso] = React.useState(1)
  const totalPasos = 4

  const pasos = [
    {
      numero: 1,
      titulo: '¡Bienvenido a CoachFlow!',
      subtitulo: 'Tu cuenta está siendo activada',
      icono: '🎉',
      contenido: (
        <div className="space-y-4 text-center">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Tu registro fue recibido correctamente. En breve un administrador activará tu cuenta y recibirás un mensaje de WhatsApp confirmándote el acceso.
          </p>
          <div className="bg-zinc-800 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Mientras tanto, conocé lo que podés hacer:</p>
            <div className="space-y-2 mt-2">
              {['Gestionar tus alumnos y sus planes', 'Crear planes de entrenamiento por semana', 'Registrar turnos y pagos', 'Compartir el portal personal de cada alumno'].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-violet-400 text-sm">✓</span>
                  <span className="text-zinc-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      numero: 2,
      titulo: 'Primero: agregá tus alumnos',
      subtitulo: 'Cada alumno tiene un portal propio',
      icono: '👥',
      contenido: (
        <div className="space-y-4">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Desde el módulo <span className="text-violet-400 font-medium">Alumnos</span> podés registrar a cada uno con su nombre, teléfono y objetivo.
          </p>
          <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-zinc-500">Cada alumno recibe un link único de acceso:</p>
            <div className="bg-zinc-700 rounded-lg px-3 py-2 text-xs text-violet-300 font-mono">
              coachflow-xi.vercel.app/alumno/XXXXXX
            </div>
            <p className="text-xs text-zinc-500">En ese link el alumno ve su plan, progreso y estado de cuenta — sin necesidad de contraseña.</p>
          </div>
          <div className="bg-violet-900/20 border border-violet-800/40 rounded-xl p-4">
            <p className="text-xs text-violet-300">💡 Podés compartir el link por WhatsApp con un solo click desde el panel de alumnos.</p>
          </div>
        </div>
      )
    },
    {
      numero: 3,
      titulo: 'Después: creá un plan',
      subtitulo: 'Planes de entrenamiento por semana',
      icono: '📋',
      contenido: (
        <div className="space-y-4">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Desde <span className="text-violet-400 font-medium">Rutinas</span> creás planes de entrenamiento divididos por semana. Podés agregar actividades de la biblioteca o crear las tuyas propias.
          </p>
          <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-zinc-500 font-medium">Cada actividad tiene:</p>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[['Cantidad', 'Series o rondas'], ['Detalle', 'Reps, distancia...'], ['Duración', 'Tiempo de pausa']].map(([titulo, desc]) => (
                <div key={titulo} className="bg-zinc-700 rounded-lg p-2 text-center">
                  <p className="text-violet-400 text-xs font-medium">{titulo}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-zinc-400 text-sm">Una vez creado el plan, lo asignás a cualquier alumno desde su perfil.</p>
        </div>
      )
    },
    {
      numero: 4,
      titulo: '¡Listo para empezar!',
      subtitulo: 'Tu sistema está configurado',
      icono: '🚀',
      contenido: (
        <div className="space-y-4">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Una vez que tu cuenta esté activa, ingresás con tu usuario y contraseña y ya podés empezar a usar todo el sistema.
          </p>
          <div className="bg-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Resumen de módulos:</p>
            {[
              ['Dashboard', 'Resumen del día, KPIs y alertas'],
              ['Alumnos', 'CRUD completo + portal personal'],
              ['Rutinas', 'Planes por semana con actividades'],
              ['Turnos', 'Agenda con recordatorios WA'],
              ['Pagos', 'Registro de cobros y deudas'],
            ].map(([mod, desc]) => (
              <div key={mod} className="flex items-center gap-3 py-1.5 border-b border-zinc-700 last:border-0">
                <span className="text-violet-400 text-xs font-medium w-16 shrink-0">{mod}</span>
                <span className="text-zinc-400 text-xs">{desc}</span>
              </div>
            ))}
          </div>
          <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-4 text-center">
            <p className="text-emerald-400 text-sm font-medium">Cuando recibas el WA de confirmación, ya podés ingresar 🎉</p>
          </div>
        </div>
      )
    }
  ]

  const pasoActual = pasos[paso - 1]

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <p className="text-violet-400 font-bold text-xl">CoachFlow</p>
        </div>

        {/* Indicador de progreso */}
        <div className="flex items-center gap-2 mb-6">
          {pasos.map((p, i) => (
            <React.Fragment key={p.numero}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${paso > p.numero ? 'bg-violet-600 text-white' : paso === p.numero ? 'bg-violet-600 text-white ring-2 ring-violet-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {paso > p.numero ? '✓' : p.numero}
              </div>
              {i < pasos.length - 1 && (
                <div className={`flex-1 h-0.5 transition-colors ${paso > p.numero ? 'bg-violet-600' : 'bg-zinc-800'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card del paso */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="text-center mb-5">
            <span className="text-4xl">{pasoActual.icono}</span>
            <h2 className="text-lg font-semibold text-white mt-3">{pasoActual.titulo}</h2>
            <p className="text-zinc-500 text-sm mt-1">{pasoActual.subtitulo}</p>
          </div>

          <div className="mb-6">{pasoActual.contenido}</div>

          <div className="flex gap-3">
            {paso > 1 && (
              <button onClick={() => setPaso(paso - 1)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-colors">
                ← Anterior
              </button>
            )}
            {paso < totalPasos ? (
              <button onClick={() => setPaso(paso + 1)}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Siguiente →
              </button>
            ) : (
              <button onClick={() => router.push('/')}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Ir al login
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-4">
          CoachFlow · Sistema para entrenadores independientes
        </p>

      </div>
    </div>
  )
}