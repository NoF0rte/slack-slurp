export interface Credentials {
  api_token: string
  d_cookie: string
  ds_cookie: string
}

export interface AuthTestResult {
  url: string
  team: string
  user: string
  team_id: string
  user_id: string
  bot_id?: string
}

export interface Team {
  name: string
  image: string
}

export type ChannelType = 'all' | 'public' | 'private' | 'direct' | 'group'

export interface Channel {
  id: string
  name: string
  is_channel: boolean
  is_im: boolean
  is_mpim: boolean
  is_private: boolean
  is_archived: boolean
  is_general: boolean
  is_external: boolean
  latest: number
  created: number
  num_members: number
  shared_teams: Team[]
  topic?: string
}

export interface User {
  name: string
  real_name: string
  email: string
  username: string
  image: string
  phone: string
  title: string
  is_admin: boolean
  is_owner: boolean
  is_bot: boolean
  deleted: boolean
}

export interface Message {
  type: string
  text: string
  user: string
  ts: string
  team: string
  channel: string
  blocks?: any[]
  attachments?: any[]
  files?: any[]
}

export interface SearchRequest {
  query: string
  channels?: string[]
  users?: string[]
  before?: string
  after?: string
  file_types?: string[]
  search_type?: 'messages' | 'files' | 'both'
}

export interface SecretScanRequest {
  channels: string[]
  detectors: string[]
  verify: boolean
  verified_only: boolean
}

export interface SecretScanResult {
  scan_id: string
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
  results?: SecretResult[]
}

export interface SecretResult {
  id: string
  detector: string
  secret: string
  context: string
  channel: string
  user: string
  timestamp: string
  verified: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface DomainSearchRequest {
  domains: string[]
  channels?: string[]
  users?: string[]
  before?: string
  after?: string
}

export interface DomainResult {
  domain: string
}

export interface DomainSearchResponse {
  search_id: string
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
  total_found?: number
  domains_searched?: string[]
}

export interface URLSearchRequest {
  channels?: string[]
  users?: string[]
  before?: string
  after?: string
}

export interface URLSearchResponse {
  search_id: string
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
  total_found?: number
}

export interface SearchResponse {
  search_id: string
  status: 'started' | 'completed' | 'failed' | 'cancelled'
  query: string
}

export interface MessageResult {
  user: string
  date: string
  channel: string
  text: string
  raw: any
}

export interface FileResult {
  id: string
  name: string
  created: string
  channels: string[]
  filetype: string
  size: number
  user: string
}

export interface WSMessage {
  type: 'error' | 'complete' | 'connected' | 'domain_result' | 'url_result' | 'message_result' | 'file_result'
  data: any
  scan_id?: string
  search_id?: string
}