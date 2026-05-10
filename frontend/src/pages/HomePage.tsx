import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, FolderOpen, Film } from 'lucide-react'
import toast from 'react-hot-toast'
import { listProjects, createProject, deleteProject } from '../api/projects'

export default function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setNewName('')
      setShowCreate(false)
      navigate(`/editor/${project.id}`)
    },
    onError: () => toast.error('Erro ao criar projeto'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto excluido')
    },
  })

  const handleCreate = () => {
    if (newName.trim()) {
      createMutation.mutate({ name: newName.trim() })
    }
  }

  return (
    <div className="h-screen w-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Film className="w-10 h-10 text-[var(--accent)]" />
          <h1 className="text-4xl font-bold">ClassyCut</h1>
        </div>
        <p className="text-[var(--text-secondary)]">Editor de video inteligente</p>
      </div>

      {/* New project */}
      <div className="w-full max-w-lg mb-8">
        {showCreate ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nome do projeto..."
              autoFocus
              className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm
                focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium
                disabled:opacity-50 transition-colors"
            >
              Criar
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)]
              text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Projeto
          </button>
        )}
      </div>

      {/* Project list */}
      <div className="w-full max-w-lg space-y-2">
        {isLoading ? (
          <p className="text-center text-[var(--text-secondary)] text-sm">Carregando...</p>
        ) : projects.length === 0 ? (
          <p className="text-center text-[var(--text-secondary)] text-sm py-8">
            Nenhum projeto ainda. Crie o primeiro!
          </p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)]
                cursor-pointer transition-colors group"
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <FolderOpen className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{project.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {project.media_count} arquivo(s) ·{' '}
                  {new Date(project.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Excluir este projeto?')) {
                    deleteMutation.mutate(project.id)
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-2 hover:text-[var(--error)] transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
