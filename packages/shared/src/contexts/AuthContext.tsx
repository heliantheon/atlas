import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { CallbackResult, IDTokenClaims } from '@heliantheons/aegis-ts'
import { getAuth, getAuthorizeOptions, getConfiguredAudienceKeys } from '../config/auth'

export interface AtlasAuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  user: IDTokenClaims | null
  initialize: () => Promise<void>
  login: (returnTo?: string) => Promise<void>
  handleCallback: (code: string, state?: string) => Promise<CallbackResult>
  logout: () => Promise<void>
  getAccessToken: (audience?: string) => Promise<string | null>
}

const AuthContext = createContext<AtlasAuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const authRef = useRef(getAuth())
  const auth = authRef.current

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<IDTokenClaims | null>(null)

  const initialize = useCallback(async () => {
    if (isAuthenticated) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const audienceKeys = getConfiguredAudienceKeys()
      let ok = false
      if (audienceKeys.length > 0) {
        for (const aud of audienceKeys) {
          if (await auth.isAuthenticated(aud)) {
            ok = true
            break
          }
        }
      } else {
        ok = await auth.isAuthenticated()
      }
      if (ok) {
        let u = await auth.getUser()
        if (!u) {
          const keys = audienceKeys.length > 0 ? audienceKeys : [undefined]
          for (const aud of keys) {
            try {
              await auth.getAccessToken(aud)
            } catch {
              /* refresh failed, ignore */
            }
          }
          u = await auth.getUser()
        }
        if (u) {
          setIsAuthenticated(true)
          setUser(u)
        } else {
          await auth.saveReturnTo(window.location.pathname + window.location.search)
          const opts = getAuthorizeOptions()
          const { url } = await auth.authorize({
            scopes: opts.scopes,
            audiences: opts.audiences ?? undefined,
          })
          window.location.href = url
          return
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [auth, isAuthenticated])

  const login = useCallback(
    async (returnTo?: string) => {
      try {
        setError(null)
        if (returnTo) await auth.saveReturnTo(returnTo)
        const opts = getAuthorizeOptions()
        const { url } = await auth.authorize({
          scopes: opts.scopes,
          audiences: opts.audiences ?? undefined,
        })
        window.location.href = url
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Login failed')
        throw e
      }
    },
    [auth]
  )

  const handleCallback = useCallback(
    async (code: string, state?: string) => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await auth.handleCallback(code, state)
        const u = await auth.getUser()
        setIsAuthenticated(true)
        setUser(u)
        setIsLoading(false)
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Callback failed')
        setIsAuthenticated(false)
        setUser(null)
        setIsLoading(false)
        throw e
      }
    },
    [auth]
  )

  const logout = useCallback(async () => {
    try {
      await auth.logout()
      setIsAuthenticated(false)
      setUser(null)
      setError(null)
    } catch {
      setIsAuthenticated(false)
      setUser(null)
    }
  }, [auth])

  const getAccessToken = useCallback(
    async (audience?: string) => {
      try {
        const token = await auth.getAccessToken(audience)
        if (!token && !audience && isAuthenticated) setIsAuthenticated(false)
        return token ?? null
      } catch {
        return null
      }
    },
    [auth, isAuthenticated]
  )

  const isCallbackRoute = location.pathname === '/auth/callback'

  useEffect(() => {
    if (!isCallbackRoute) {
      initialize()
    }
  }, [initialize, isCallbackRoute])

  useEffect(() => {
    const onLogin = () =>
      auth.getUser().then(u => {
        setUser(u)
      })
    const offLogin = auth.on('login', onLogin)
    const offLogout = auth.on('logout', () => {
      setIsAuthenticated(false)
      setUser(null)
    })
    return () => {
      offLogin()
      offLogout()
    }
  }, [auth])

  const value: AtlasAuthContextValue = {
    isAuthenticated,
    isLoading,
    error,
    user,
    initialize,
    login,
    handleCallback,
    logout,
    getAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAtlasAuthContext(): AtlasAuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAtlasAuth must be used within AuthProvider')
  }
  return ctx
}
