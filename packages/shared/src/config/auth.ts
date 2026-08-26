import { Auth } from '@heliantheons/aegis-ts'
import { apiEndpoints } from './env'

export const authConfig = {
  endpoint: apiEndpoints.auth.replace('/api', ''),
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID || 'atlas',
  redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`,
}

export const defaultScopes = ['openid', 'profile', 'email', 'offline_access']
export const defaultScopeString = defaultScopes.join(' ')

export type AudienceConfig = Record<string, { scope?: string }>

const allAudiences: AudienceConfig = {
  hermes: { scope: defaultScopeString },
  zwei: { scope: defaultScopeString },
  chaos: { scope: defaultScopeString },
}

let configuredAudiences: AudienceConfig = allAudiences

export function configureAudiences(audiences: AudienceConfig): void {
  configuredAudiences = audiences
}

export function getAuthorizeOptions() {
  return {
    scopes: defaultScopes,
    audiences: configuredAudiences,
  }
}

/** 返回配置的 audience 列表，用于 isAuthenticated 检查。Hermes/Zwei 等单 audience 应用只配一个。 */
export function getConfiguredAudienceKeys(): string[] {
  return Object.keys(configuredAudiences)
}

let authInstance: Auth | null = null

export function getAuth(): Auth {
  if (!authInstance) {
    authInstance = new Auth({
      endpoint: authConfig.endpoint,
      clientId: authConfig.clientId,
      redirectUri: authConfig.redirectUri,
    })
  }
  return authInstance
}

export function resetAuth(): void {
  authInstance = null
}
