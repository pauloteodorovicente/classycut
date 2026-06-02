import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { resetPassword } from '../api/auth'

type View = 'login' | 'reset'

export default function LoginPage() {
  const [view, setView] = useState<View>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const [resetEmail, setResetEmail] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  useState(() => { clearError() })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch {
      // error is already set in the store
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetError('')
    if (resetNewPassword !== resetConfirm) {
      setResetError('Passwords do not match')
      return
    }
    if (resetNewPassword.length < 6) {
      setResetError('Password must be at least 6 characters')
      return
    }
    setResetLoading(true)
    try {
      await resetPassword(resetEmail, resetNewPassword)
      setResetSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setResetError(msg ?? 'Email not found')
    } finally {
      setResetLoading(false)
    }
  }

  function backToLogin() {
    setView('login')
    setResetEmail('')
    setResetNewPassword('')
    setResetConfirm('')
    setResetError('')
    setResetSuccess(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-xl bg-neutral-900 border border-neutral-800">
        <h1 className="text-2xl font-bold text-white text-center">ClassyCut</h1>

        {view === 'login' ? (
          <>
            <p className="text-neutral-400 text-center text-sm">Sign in to your account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-neutral-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setView('reset')}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium transition-colors"
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-neutral-400">
              No account?{' '}
              <Link to="/register" className="text-violet-400 hover:text-violet-300">
                Create one
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-neutral-400 text-center text-sm">Reset your password</p>

            {resetSuccess ? (
              <div className="space-y-4">
                <p className="text-green-400 text-sm text-center">
                  Password updated successfully!
                </p>
                <button
                  onClick={backToLogin}
                  className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-1">New password</label>
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Confirm new password</label>
                  <input
                    type="password"
                    required
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                    placeholder="••••••••"
                  />
                </div>

                {resetError && (
                  <p className="text-red-400 text-sm">{resetError}</p>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  {resetLoading ? 'Updating…' : 'Reset password'}
                </button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="w-full py-2 rounded-lg border border-neutral-700 hover:border-neutral-600 text-neutral-400 hover:text-neutral-300 text-sm transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
