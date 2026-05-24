import api from './client'
import type { MediaFile, MergeRequest } from '../types/media'

export async function listMedia(projectId: string): Promise<MediaFile[]> {
  const { data } = await api.get(`/projects/${projectId}/media`)
  return data
}

export async function uploadMedia(
  projectId: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<MediaFile[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const base = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : '/api/v1'
  const token = localStorage.getItem('classycut_token')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${base}/projects/${projectId}/media`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 401) {
        localStorage.removeItem('classycut_token')
        window.location.href = '/login'
        reject(new Error('Unauthorized'))
      } else if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })
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
  const base = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : '/api/v1'
  return `${base}/media/${mediaId}/stream`
}

export async function getWaveform(mediaId: string, samples = 800): Promise<number[]> {
  const { data } = await api.get(`/media/${mediaId}/waveform`, { params: { samples } })
  return data.samples as number[]
}
