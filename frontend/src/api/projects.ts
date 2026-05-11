import api from './client'
import type { Project, ProjectCreate } from '../types/project'

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get('/projects')
  return data
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await api.get(`/projects/${id}`)
  return data
}

export async function createProject(payload: ProjectCreate): Promise<Project> {
  const { data } = await api.post('/projects', payload)
  return data
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`)
}

export async function generateShareLink(id: string): Promise<{ share_token: string; share_url: string }> {
  const { data } = await api.post(`/projects/${id}/share`)
  return data
}

export async function revokeShareLink(id: string): Promise<void> {
  await api.delete(`/projects/${id}/share`)
}

export async function getSharedProject(token: string): Promise<{ id: string; name: string; media_files: Array<{ id: string; filename: string; media_type: string; duration_ms: number | null; file_size: number | null }> }> {
  const { data } = await api.get(`/share/${token}`)
  return data
}
