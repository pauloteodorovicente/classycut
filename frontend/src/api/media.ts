import api from './client'
import type { MediaFile, MergeRequest } from '../types/media'

export async function listMedia(projectId: string): Promise<MediaFile[]> {
  const { data } = await api.get(`/projects/${projectId}/media`)
  return data
}

export async function uploadMedia(projectId: string, files: File[]): Promise<MediaFile[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  const { data } = await api.post(`/projects/${projectId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await api.delete(`/media/${mediaId}`)
}

export async function mergeMedia(
  projectId: string,
  payload: MergeRequest
): Promise<{ job_id: string; status: string }> {
  const { data } = await api.post(`/projects/${projectId}/merge`, payload)
  return data
}

export function getStreamUrl(mediaId: string): string {
  return `/api/v1/media/${mediaId}/stream`
}

export async function getWaveform(mediaId: string, samples = 800): Promise<number[]> {
  const { data } = await api.get(`/media/${mediaId}/waveform`, { params: { samples } })
  return data.samples as number[]
}
