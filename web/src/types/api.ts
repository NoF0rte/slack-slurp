export interface Credentials {
  apiToken: string
  dCookie: string
  dsCookie: string
}

export interface AuthTestResult {
  url: string
  team: string
  user: string
  teamId: string
  userId: string
  botId?: string
}

export interface Team {
  name: string
  image: string
}

export type ChannelType = 'all' | 'public' | 'private' | 'direct' | 'group'

export interface Channel {
  id: string
  name: string
  isChannel: boolean
  isIm: boolean
  isMpim: boolean
  isPrivate: boolean
  isArchived: boolean
  isGeneral: boolean
  isExternal: boolean
  latest: number
  created: number
  numMembers: number
  sharedTeams: Team[]
  topic?: string
}

export interface User {
  name: string
  realName: string
  email: string
  username: string
  image: string
  phone: string
  title: string
  isAdmin: boolean
  isOwner: boolean
  isBot: boolean
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
  fileTypes?: string[]
  searchType?: 'messages' | 'files' | 'both'
}

export interface SecretScanRequest {
  channels?: string[]
  users?: string[]
  before?: string
  after?: string
  detectors: string[]
  verify: boolean
  verifiedOnly: boolean
}

export interface SecretScanResult {
  scanId: string
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
}

export interface Secret {
  raw: string
  verified: boolean
}

export interface SecretResult {
  id: string
  detector: string
  secrets: Secret[]
  context: string
  channel: string
  user: string
  timestamp: string
  verified: boolean
  falsePositive: boolean
}

export interface CustomDetector {
  id: string
  name: string
  keywords: string[]
  patterns: string[]
  description: string
  createdAt: string
  updatedAt: string
}

export interface DetectorInfo {
  id: string
  name: string
  description: string
  isCustom: boolean
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
  searchId: string
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
  totalFound?: number
  domainsSearched?: string[]
}

export interface URLSearchRequest {
  channels?: string[]
  users?: string[]
  before?: string
  after?: string
}

export interface URLSearchResponse {
  searchId: string
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
  totalFound?: number
}

export interface SearchResponse {
  searchId: string
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
  id: string
  type: 'error' | 'complete' | 'connected' | 'domainResult' | 'urlResult' | 'messageResult' | 'fileResult'
  data: any
}