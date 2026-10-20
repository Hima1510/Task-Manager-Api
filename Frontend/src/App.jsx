import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const emptyForm = { title: '', description: '', priority: 'medium' }

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('taskManagerToken') || '')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const logout = useCallback(() => {
    localStorage.removeItem('taskManagerToken')
    setToken('')
    setUser(null)
    setTasks([])
    setLoading(false)
    setAuthError('Your session expired. Please log in again.')
  }, [])

  const apiFetch = useCallback(async (path, options = {}) => {
    const headers = new Headers(options.headers || {})
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (response.status === 401 && token) logout()
    return response
  }, [logout, token])

  const loadTasks = useCallback(async () => {
    if (!token) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch('/tasks')
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to load tasks')
      setTasks(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, token])

  useEffect(() => {
    if (!token) { setLoading(false); return }
    let active = true
    apiFetch('/me').then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Please log in again')
      if (active) setUser(data.user)
    }).catch((err) => {
      if (active) { setAuthError(err.message); logout() }
    })
    return () => { active = false }
  }, [apiFetch, logout, token])

  useEffect(() => { loadTasks() }, [loadTasks])
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function handleAuth(event) {
    event.preventDefault()
    setAuthError('')
    try {
      const response = await fetch(`${API_BASE}/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Authentication failed')
      if (authMode === 'register') {
        setAuthMode('login')
        setAuthForm((current) => ({ ...current, password: '' }))
        setAuthError('Account created. Log in with your credentials.')
        return
      }
      localStorage.setItem('taskManagerToken', data.token)
      setUser(data.user)
      setToken(data.token)
      setAuthForm({ email: '', password: '' })
      setAuthError('')
    } catch (err) { setAuthError(err.message || 'Something went wrong') }
  }

  function resetForm() { setForm(emptyForm); setEditingId(null) }
  function showToast(message, type = 'success') { setToast({ message, type }) }
  function editTask(task) {
    setEditingId(task._id)
    setForm({ title: task.title ?? '', description: task.description ?? '', priority: task.priority || 'medium' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const wasEditing = Boolean(editingId)
    try {
      const response = await apiFetch(editingId ? `/tasks/${editingId}` : '/tasks', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, title: form.title.trim(), description: form.description.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.map((item) => item.message).join(', ') || data.message || 'Request failed')
      resetForm()
      await loadTasks()
      showToast(wasEditing ? 'Task updated successfully.' : 'Task created successfully.')
    } catch (err) { setError(err.message); showToast(err.message, 'error') }
    finally { setSubmitting(false) }
  }

  async function deleteTask(id) {
    if (!window.confirm('Delete this task? This action cannot be undone.')) return
    try {
      const response = await apiFetch(`/tasks/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not delete task')
      await loadTasks()
      if (editingId === id) resetForm()
      showToast('Task deleted successfully.')
    } catch (err) { setError(err.message); showToast(err.message, 'error') }
  }

  if (!token) return (
    <main className="page auth-page">
      <section className="panel form-panel auth-panel">
        <h1>Task Manager</h1>
        <p className="subtitle">{authMode === 'login' ? 'Log in to manage your tasks.' : 'Create an account to get started.'}</p>
        <form className="task-form" onSubmit={handleAuth}>
          <label>Email<input type="email" autoComplete="email" required value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></label>
          <label>Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength="8" required value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></label>
          {authError && <p className="error">{authError}</p>}
          <button type="submit">{authMode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        <p className="auth-switch">{authMode === 'login' ? 'New here?' : 'Already have an account?'} <button type="button" className="link-button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>{authMode === 'login' ? 'Create an account' : 'Log in'}</button></p>
      </section>
    </main>
  )

  return (
    <main className="page">
      {toast && <div className={`toast ${toast.type}`}><span>{toast.message}</span><button type="button" className="toast-close" onClick={() => setToast(null)}>×</button></div>}
      <section className="panel form-panel">
        <div className="account-bar"><div><h1>Task Manager</h1><p className="subtitle">Add and manage your personal tasks.</p></div><div className="account-actions"><span>{user?.email}</span><button className="secondary" type="button" onClick={logout}>Log out</button></div></div>
        <form onSubmit={handleSubmit} className="task-form">
          <label>Title<input type="text" maxLength="120" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter task title" required /></label>
          <label>Description<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></label>
          <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <div className="actions"><button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editingId ? 'Update Task' : 'Add Task'}</button>{editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel</button>}</div>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
      <section className="panel list-panel"><h2>Tasks</h2>
        {loading && <p className="muted">Loading tasks...</p>}{!loading && tasks.length === 0 && <p className="muted">No tasks added yet.</p>}
        <div className="task-list">{tasks.map((task) => <article key={task._id} className="task-card"><div className="task-head"><div><p className={`badge ${task.priority || 'medium'}`}>{task.priority || 'medium'}</p><h3>{task.title}</h3></div></div>{task.description && <p className="description">{task.description}</p>}<div className="card-actions"><button type="button" className="secondary" onClick={() => editTask(task)}>Edit</button><button type="button" className="danger" onClick={() => deleteTask(task._id)}>Delete</button></div></article>)}</div>
      </section>
    </main>
  )
}

export default App
