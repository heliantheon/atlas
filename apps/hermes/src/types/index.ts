// Hermes 身份与访问管理类型定义（与后端 DTO 一致，无 _id）

export interface Items<T> {
  items: T[]
  next?: string
}

export interface Domain {
  domain_id: string
  name: string
  description?: string
}

export interface DomainCreateRequest {
  domain_id: string
  name: string
  description?: string
}

export interface DomainUpdateRequest {
  name?: string
  description?: string | null
}

export interface Service {
  service_id: string
  domain_id: string
  name: string
  description?: string
  logo_url?: string
  access_token_expires_in: number
  refresh_token_expires_in: number
  created_at: string
  updated_at: string
}

export interface Application {
  domain_id: string
  app_id: string
  name: string
  description?: string
  logo_url?: string
  allowed_redirect_uris?: string[]
  allowed_origins?: string[]
  allowed_logout_uris?: string[]
  id_token_expires_in: number
  refresh_token_expires_in: number
  refresh_token_absolute_expires_in: number
  created_at: string
  updated_at: string
}

export type ApplicationSecretType = 'basic'

export interface ApplicationSecret {
  client_id: string
  type: ApplicationSecretType
  secret: string
}

export interface ApplicationIDPConfig {
  app_id: string
  type: string
  priority: number
  strategy?: string
  delegate?: string
  require?: string
  created_at: string
  updated_at: string
}

export interface DomainIDP {
  domain_id: string
  idp_type: string
  created_at: string
}

export interface Relationship {
  service_id: string
  subject_type: 'user' | 'group' | 'application'
  subject_id: string
  relation: string
  object_type: string
  object_id: string
  created_at: string
  expires_at?: string
}

export interface Group {
  group_id: string
  service_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface ApplicationServiceRelation {
  service_id: string
  relations: string[] // 该服务授予本应用的权限类型，["*"] 表示全部
}

/** 服务侧：该服务已授权给哪些应用及授予的权限（ReBAC） */
export interface ServiceApplicationRelation {
  app_id: string
  relations: string[]
}

// 请求类型
export interface ServiceCreateRequest {
  service_id: string
  domain_id: string
  name: string
  description: string
  access_token_expires_in?: number
  refresh_token_expires_in?: number
}

export interface ServiceUpdateRequest {
  name?: string
  description?: string
  access_token_expires_in?: number
  refresh_token_expires_in?: number
  status?: number
}

export interface ApplicationCreateRequest {
  domain_id: string
  app_id: string
  name: string
  description: string
  allowed_redirect_uris?: string[]
  allowed_origins?: string[]
  allowed_logout_uris?: string[]
  need_key?: boolean
}

export interface ApplicationUpdateRequest {
  name?: string
  description?: string
  allowed_redirect_uris?: string[]
  allowed_origins?: string[]
  allowed_logout_uris?: string[]
  id_token_expires_in?: number
  refresh_token_expires_in?: number
  refresh_token_absolute_expires_in?: number
}

export interface ApplicationIDPConfigCreateRequest {
  type: string
  priority?: number
  strategy?: string
  delegate?: string
  require?: string
}

export interface ApplicationIDPConfigUpdateRequest {
  priority?: number
  strategy?: string
  delegate?: string
  require?: string
}

export interface ApplicationServiceRelationRequest {
  app_id: string
  service_id: string
  relations: string[]
}

export interface RelationshipCreateRequest {
  service_id: string
  subject_type: 'user' | 'group' | 'application'
  subject_id: string
  relation: string
  object_type: string
  object_id: string
  expires_at?: string // ISO 8601 格式
}

export interface RelationshipUpdateRequest {
  service_id: string
  subject_type: 'user' | 'group' | 'application'
  subject_id: string
  relation: string // 旧的关系类型
  object_type: string
  object_id: string
  new_relation?: string // 新的关系类型
  expires_at?: string | null // ISO 8601 格式，null 表示清除
}

export interface RelationshipDeleteRequest {
  service_id: string
  subject_type: 'user' | 'group' | 'application'
  subject_id: string
  relation: string
  object_type: string
  object_id: string
}

export interface GroupCreateRequest {
  group_id: string
  name: string
  description?: string
}

export interface GroupUpdateRequest {
  name?: string
  description?: string
}

export interface GroupMemberRequest {
  group_id: string
  user_ids: string[]
}
