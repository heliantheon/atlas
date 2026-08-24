import { hermesRequest as request, type FilterSpec, listParams } from '@atlas/shared'
import type {
  Items,
  Domain,
  DomainCreateRequest,
  DomainUpdateRequest,
  DomainIDP,
  Service,
  Application,
  ApplicationSecret,
  ApplicationSecretType,
  ApplicationIDPConfig,
  ApplicationIDPConfigCreateRequest,
  ApplicationIDPConfigUpdateRequest,
  ApplicationServiceRelation,
  ServiceApplicationRelation,
  Relationship,
  Group,
  ServiceCreateRequest,
  ServiceUpdateRequest,
  ApplicationCreateRequest,
  ApplicationUpdateRequest,
  RelationshipCreateRequest,
  RelationshipDeleteRequest,
  GroupCreateRequest,
  GroupUpdateRequest,
  GroupMemberRequest,
} from '@/types'

// hermesRequest 的 baseURL 已指向网关公开的 /api 根路径，业务请求只传资源路径。
export const domainApi = {
  getList: () => request.get<Domain[]>('/domains'),
  getDetail: (domainId: string) => request.get<Domain>(`/domains/${domainId}`),
  create: (data: DomainCreateRequest) => request.post<Domain>('/domains', data),
  update: (domainId: string, data: DomainUpdateRequest) =>
    request.patch<Domain>(`/domains/${domainId}`, data),
  delete: (domainId: string) => request.delete(`/domains/${domainId}`),
  getIDPs: (domainId: string) => request.get<DomainIDP[]>(`/domains/${domainId}/idps`),
}

export const serviceApi = {
  getList: (
    domainId: string,
    filter?: FilterSpec,
    pagination?: { token?: string; size?: number }
  ) =>
    request.get<Items<Service>>(`/domains/${domainId}/services`, {
      params: listParams(filter, pagination),
    }),
  getDetail: (domainId: string, serviceId: string) =>
    request.get<Service>(`/domains/${domainId}/services/${serviceId}`),
  /** 服务侧：该服务已授权给哪些应用及授予的权限（ReBAC） */
  getApplicationRelations: (domainId: string, serviceId: string) =>
    request.get<ServiceApplicationRelation[]>(
      `/domains/${domainId}/services/${serviceId}/applications`
    ),
  /** 某服务授予某应用的关系列表 */
  getServiceAppRelations: (domainId: string, serviceId: string, appId: string) =>
    request.get<{ relations: string[] }>(
      `/domains/${domainId}/services/${serviceId}/applications/${appId}/relations`
    ),
  /** 设置某服务授予某应用的关系 */
  setServiceAppRelations: (
    domainId: string,
    serviceId: string,
    appId: string,
    relations: string[]
  ) =>
    request.put(`/domains/${domainId}/services/${serviceId}/applications/${appId}/relations`, {
      relations,
    }),
  create: (domainId: string, data: Omit<ServiceCreateRequest, 'domain_id'>) =>
    request.post<Service>(`/domains/${domainId}/services`, data),
  update: (domainId: string, serviceId: string, data: ServiceUpdateRequest) =>
    request.patch(`/domains/${domainId}/services/${serviceId}`, data),
  delete: (domainId: string, serviceId: string) =>
    request.delete(`/domains/${domainId}/services/${serviceId}`),
}

export const applicationApi = {
  getList: (
    domainId: string,
    filter?: FilterSpec,
    pagination?: { token?: string; size?: number }
  ) =>
    request.get<Items<Application>>(`/domains/${domainId}/applications`, {
      params: listParams(filter, pagination),
    }),
  getDetail: (domainId: string, appId: string) =>
    request.get<Application>(`/domains/${domainId}/applications/${appId}`),
  create: (domainId: string, data: Omit<ApplicationCreateRequest, 'domain_id'>) =>
    request.post<Application>(`/domains/${domainId}/applications`, data),
  update: (domainId: string, appId: string, data: ApplicationUpdateRequest) =>
    request.patch(`/domains/${domainId}/applications/${appId}`, data),
  getSecret: (domainId: string, appId: string, type: ApplicationSecretType) =>
    request.get<ApplicationSecret>(`/domains/${domainId}/applications/${appId}/secrets/${type}`),
  /** 该应用在各服务下被授予的权限（按服务聚合） */
  getServiceRelations: (domainId: string, appId: string) =>
    request.get<ApplicationServiceRelation[]>(
      `/domains/${domainId}/applications/${appId}/relations`
    ),
  delete: (domainId: string, appId: string) =>
    request.delete(`/domains/${domainId}/applications/${appId}`),
  getIDPConfigs: (domainId: string, appId: string) =>
    request.get<ApplicationIDPConfig[]>(`/domains/${domainId}/applications/${appId}/idp-configs`),
  createIDPConfig: (domainId: string, appId: string, data: ApplicationIDPConfigCreateRequest) =>
    request.post(`/domains/${domainId}/applications/${appId}/idp-configs`, data),
  updateIDPConfig: (
    domainId: string,
    appId: string,
    idpType: string,
    data: ApplicationIDPConfigUpdateRequest
  ) => request.patch(`/domains/${domainId}/applications/${appId}/idp-configs/${idpType}`, data),
  deleteIDPConfig: (domainId: string, appId: string, idpType: string) =>
    request.delete(`/domains/${domainId}/applications/${appId}/idp-configs/${idpType}`),
}

export const relationshipApi = {
  getList: (filter?: FilterSpec, pagination?: { token?: string; size?: number }) =>
    request.get<Items<Relationship>>('/relationships', { params: listParams(filter, pagination) }),
  create: (data: RelationshipCreateRequest) => request.post<Relationship>('/relationships', data),
  delete: (data: RelationshipDeleteRequest) => request.delete('/relationships', { data }),
}

export const groupApi = {
  getList: (filter?: FilterSpec, pagination?: { token?: string; size?: number }) =>
    request.get<Items<Group>>('/groups', { params: listParams(filter, pagination) }),
  getDetail: (groupId: string) => request.get<Group>(`/groups/${groupId}`),
  create: (data: GroupCreateRequest) => request.post<Group>('/groups', data),
  update: (groupId: string, data: GroupUpdateRequest) => request.patch(`/groups/${groupId}`, data),
  setMembers: (groupId: string, data: GroupMemberRequest) =>
    request.post(`/groups/${groupId}/members`, data),
  getMembers: (groupId: string) => request.get<{ members: string[] }>(`/groups/${groupId}/members`),
}
