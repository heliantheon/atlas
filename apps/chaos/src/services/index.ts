import { apiEndpoints, chaosRequest as request, getAuth } from '@atlas/shared'

export interface EmailTemplate {
  template_id: string
  name: string
  description?: string
  subject: string
  content: string
  type: string
  variables?: string
  service_id?: string
  is_builtin: boolean
  is_enabled: boolean
  created_at: string
  updated_at: string
}

/**
 * Chaos currently serializes its persistence model directly, so deployed
 * versions return Go field names while the intended public contract uses
 * snake_case. Keep that wire-format discrepancy at the service boundary.
 */
interface EmailTemplateWire {
  template_id?: string
  TemplateID?: string
  name?: string
  Name?: string
  description?: string | null
  Description?: string | null
  subject?: string
  Subject?: string
  content?: string
  Content?: string
  type?: string
  Type?: string
  variables?: string | null
  Variables?: string | null
  service_id?: string | null
  ServiceID?: string | null
  is_builtin?: boolean
  IsBuiltin?: boolean
  is_enabled?: boolean
  IsEnabled?: boolean
  created_at?: string
  CreatedAt?: string
  updated_at?: string
  UpdatedAt?: string
}

function normalizeTemplate(value: EmailTemplateWire): EmailTemplate {
  const templateId = value.template_id ?? value.TemplateID
  if (!templateId) throw new Error('Chaos 模板响应缺少 template_id')
  return {
    template_id: templateId,
    name: value.name ?? value.Name ?? '',
    description: value.description ?? value.Description ?? undefined,
    subject: value.subject ?? value.Subject ?? '',
    content: value.content ?? value.Content ?? '',
    type: value.type ?? value.Type ?? 'html',
    variables: value.variables ?? value.Variables ?? undefined,
    service_id: value.service_id ?? value.ServiceID ?? undefined,
    is_builtin: value.is_builtin ?? value.IsBuiltin ?? false,
    is_enabled: value.is_enabled ?? value.IsEnabled ?? false,
    created_at: value.created_at ?? value.CreatedAt ?? '',
    updated_at: value.updated_at ?? value.UpdatedAt ?? '',
  }
}

export interface FileUploadResult {
  key: string
  file_name: string
  file_size: number
  content_type: string
  public_url: string
}

export interface SendMailRequest {
  to: string
  subject?: string
  template_id: string
  variables?: Record<string, unknown>
  data?: Record<string, unknown>
  expires_at?: string
}

export interface SendMailResponse {
  delivery_id: string
}

export interface TemplateCreateRequest {
  template_id: string
  name: string
  description?: string
  subject: string
  content: string
  variables?: string
  service_id?: string
}

export interface TemplateUpdateRequest {
  name?: string
  description?: string
  subject?: string
  content?: string
  variables?: string
  is_enabled?: boolean
}

export interface RenderResponse {
  subject: string
  body: string
}

export const chaosTemplateApi = {
  getList: async (serviceId?: string) => {
    const templates = await request.get<EmailTemplateWire[]>('/templates', {
      params: serviceId ? { service_id: serviceId } : undefined,
    })
    return templates.map(normalizeTemplate)
  },
  getDetail: async (templateId: string) =>
    normalizeTemplate(await request.get<EmailTemplateWire>(`/templates/${templateId}`)),
  create: async (data: TemplateCreateRequest) =>
    normalizeTemplate(await request.post<EmailTemplateWire>('/templates', data)),
  update: (templateId: string, data: TemplateUpdateRequest) =>
    request.patch(`/templates/${templateId}`, data),
  delete: (templateId: string) => request.delete(`/templates/${templateId}`),
  render: (templateId: string, data: Record<string, unknown>) =>
    request.post<RenderResponse>(`/templates/${templateId}/render`, { data }),
}

export const chaosMailApi = {
  send: (data: SendMailRequest) => request.post<SendMailResponse>('/mail', data),
}

export interface PresignUploadRequest {
  file_name: string
  content_type: string
  path?: string
  prefix?: string
}

export interface PresignUploadResponse {
  upload_url: string
  key: string
  public_url: string
  expires_in: number
}

export const chaosStorageApi = {
  presign: (data: PresignUploadRequest) => request.post<PresignUploadResponse>('/presign', data),
  upload: async (file: File, options?: { path?: string; prefix?: string }) => {
    const target = await chaosStorageApi.presign({
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      path: options?.path,
      prefix: options?.prefix,
    })
    const response = await fetch(target.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    })
    if (!response.ok) throw new Error(`对象存储上传失败 (${response.status})`)
    return {
      key: target.key,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || 'application/octet-stream',
      public_url: target.public_url,
    } satisfies FileUploadResult
  },
}

export interface LogEntry {
  timestamp: string
  timestamp_ns: string
  service: string
  severity: string
  body: string
  trace_id?: string
  span_id?: string
  labels: Record<string, string>
  attributes?: Record<string, unknown>
}

export interface LogQueryResult {
  entries: LogEntry[]
  start: string
  end: string
  limit: number
}

export interface LogQueryParams {
  service?: string
  severity?: string
  environment?: string
  trace_id?: string
  search?: string
  start?: string
  end?: string
  limit?: number
  direction?: 'forward' | 'backward'
}

function appendLogParams(url: URL, params: LogQueryParams) {
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  })
}

async function streamLogs(
  params: LogQueryParams,
  signal: AbortSignal,
  onEntry: (entry: LogEntry) => void
) {
  const url = new URL(`${apiEndpoints.chaos}/logs/stream`)
  appendLogParams(url, params)
  const token = await getAuth().getAccessToken('chaos')
  const response = await fetch(url, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok || !response.body) {
    throw new Error(`日志流连接失败 (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (!signal.aborted) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const event = frame.match(/^event:\s*(.+)$/m)?.[1]
      const data = frame.match(/^data:\s*(.+)$/m)?.[1]
      if (event === 'log' && data) onEntry(JSON.parse(data) as LogEntry)
      if (event === 'error') throw new Error('日志流已中断')
      boundary = buffer.indexOf('\n\n')
    }
  }
}

export const chaosLogApi = {
  query: (params: LogQueryParams) => request.get<LogQueryResult>('/logs', { params }),
  stream: streamLogs,
}
