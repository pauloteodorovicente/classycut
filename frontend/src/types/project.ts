export interface Project {
  id: string
  name: string
  settings_json: string
  created_at: string
  updated_at: string
  media_count: number
}

export interface ProjectCreate {
  name: string
}
