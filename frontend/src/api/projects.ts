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
