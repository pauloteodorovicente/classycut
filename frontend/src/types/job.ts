export interface Job {
  id: string
  project_id: string | null
  job_type: string
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled'
  progress: number
  params_json: string | null
  result_json: string | null
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}
