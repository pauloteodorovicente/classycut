import api from './client'
import type { Job } from '../types/job'

export async function listJobs(projectId?: string): Promise<Job[]> {
  const params = projectId ? { project_id: projectId } : {}
  const { data } = await api.get('/jobs', { params })
  return data
}

export async function getJob(jobId: string): Promise<Job> {
  const { data } = await api.get(`/jobs/${jobId}`)
  return data
}
