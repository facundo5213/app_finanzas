import React, { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Car,
  Pencil,
  PiggyBank,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const monthKey = (dateStr) => {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const formatARS = (value) => {
  const n = Number(value || 0)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

const formatUSD = (value) => {
  const n = Number(value || 0)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

const startOfToday = () => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

const getWeekOfMonth = (dateStr) => {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 1
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const dayOffset = first.getDay() === 0 ? 6 : first.getDay() - 1
  return Math.floor((d.getDate() + dayOffset - 1) / 7) + 1
}

const currentMonthLabel = () => {
  const d = new Date()
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

const defaultFixedExpenses = [
  { id: 1, name: 'Monotributo', amount: 65000 },
  { id: 2, name: 'Peluquería', amount: 25000 },
  { id: 3, name: 'Dentista', amount: 40000 },
  { id: 4, name: 'Facultad', amount: 320000 },
  { id: 5, name: 'Gym', amount: 38000 },
  { id: 6, name: 'Comida masa muscular', amount: 100000 },
]

const categories = ['comida', 'transporte', 'salidas', 'salud', 'ropa', 'estudio', 'hogar', 'extras']

function Card({ children }) {
  return <div className="card">{children}</div>
}

function KPI({ title, value, subtitle, icon: Icon }) {
  return (
    <Card>
      <div className="kpi-row">
        <div>
          <div className="muted">{title}</div>
          <div className="kpi-value">{value}</div>
          {subtitle ? <div className="tiny muted">{subtitle}</div> : null}
        </div>
        <div className="icon-chip"><Icon size={18} /></div>
      </div>
    </Card>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button className={`tab-btn ${active ? 'tab-btn-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export default function App() {
  const [tab, setTab] = useState('resumen')
  const [income, setIncome] = useState(1070000)
  const [fixedExpenses, setFixedExpenses] = useState(defaultFixedExpenses)
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(180000)
  const [carUsdTarget, setCarUsdTarget] = useState(6000)
  const [usdRate, setUsdRate] = useState(1432)
  const [carSavedArs, setCarSavedArs] = useState(0)
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({
    date: startOfToday(),
    concept: '',
    category: 'extras',
    amount: '',
    notes: '',
  })
  const [editExpenseId, setEditExpenseId] = useState(null)
  const [fixedForm, setFixedForm] = useState({ name: '', amount: '' })

  useEffect(() => {
    const raw = localStorage.getItem('presupuesto-mobile-v1')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      setIncome(parsed.income ?? 1070000)
      setFixedExpenses(parsed.fixedExpenses?.length ? parsed.fixedExpenses : defaultFixedExpenses)
      setMonthlySavingsTarget(parsed.monthlySavingsTarget ?? 180000)
      setCarUsdTarget(parsed.carUsdTarget ?? 6000)
      setUsdRate(parsed.usdRate ?? 1432)
      setCarSavedArs(parsed.carSavedArs ?? 0)
      setHistory(Array.isArray(parsed.history) ? parsed.history : [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'presupuesto-mobile-v1',
      JSON.stringify({ income, fixedExpenses, monthlySavingsTarget, carUsdTarget, usdRate, carSavedArs, history }),
    )
  }, [income, fixedExpenses, monthlySavingsTarget, carUsdTarget, usdRate, carSavedArs, history])

  const totalFixed = useMemo(
    () => fixedExpenses.reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [fixedExpenses],
  )

  const availableForMonth = Math.max(income - totalFixed - monthlySavingsTarget, 0)
  const weeklyBase = availableForMonth / 4
  const currentMonth = monthKey(startOfToday())

  const currentMonthHistory = useMemo(
    () => history.filter((item) => monthKey(item.date) === currentMonth && Number(item.amount || 0) > 0),
    [history, currentMonth],
  )

  const weeklyRows = useMemo(() => {
    const groups = [1, 2, 3, 4, 5].map((week) => ({
      week,
      spent: currentMonthHistory
        .filter((item) => getWeekOfMonth(item.date) === week)
        .reduce((acc, item) => acc + Number(item.amount || 0), 0),
    }))

    let carry = 0

    return groups.map((row) => {
      const available = weeklyBase + carry
      const balance = available - row.spent
      carry = balance
      return {
        ...row,
        available,
        balance,
        status: balance >= 15000 ? 'ok' : balance >= 0 ? 'warning' : 'danger',
      }
    })
  }, [currentMonthHistory, weeklyBase])

  const variableSpent = currentMonthHistory.reduce((acc, item) => acc + Number(item.amount || 0), 0)
  const realSavings = Math.max(income - totalFixed - variableSpent, 0)
  const monthBalance = income - totalFixed - variableSpent - monthlySavingsTarget

  const categoryTotals = useMemo(() => {
    const map = new Map()
    currentMonthHistory.forEach((item) => {
      const key = item.category || 'extras'
      map.set(key, (map.get(key) || 0) + Number(item.amount || 0))
    })
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }, [currentMonthHistory])

  const carTargetArs = carUsdTarget * usdRate
  const carSavedUsd = usdRate > 0 ? carSavedArs / usdRate : 0
  const carProgress = carTargetArs > 0 ? Math.min((carSavedArs / carTargetArs) * 100, 100) : 0
  const monthsToCar = monthlySavingsTarget > 0 ? Math.ceil(Math.max(carTargetArs - carSavedArs, 0) / monthlySavingsTarget) : 0

  const resetExpenseForm = () => {
    setForm({ date: startOfToday(), concept: '', category: 'extras', amount: '', notes: '' })
    setEditExpenseId(null)
  }

  const saveExpense = () => {
    const amount = Number(form.amount || 0)
    if (!form.date || !form.concept.trim() || amount <= 0) return

    if (editExpenseId) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === editExpenseId
            ? { ...item, date: form.date, concept: form.concept.trim(), category: form.category, amount, notes: form.notes.trim() }
            : item,
        ),
      )
    } else {
      setHistory((prev) => [
        { id: Date.now(), date: form.date, concept: form.concept.trim(), category: form.category, amount, notes: form.notes.trim() },
        ...prev,
      ])
    }

    resetExpenseForm()
    setTab('historial')
  }

  const startEditExpense = (item) => {
    setEditExpenseId(item.id)
    setForm({
      date: item.date,
      concept: item.concept,
      category: item.category,
      amount: String(item.amount),
      notes: item.notes || '',
    })
    setTab('seguimiento')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeExpense = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
    if (editExpenseId === id) resetExpenseForm()
  }

  const updateFixed = (id, field, value) => {
    setFixedExpenses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: field === 'amount' ? Number(value || 0) : value } : item)),
    )
  }

  const addFixedExpense = () => {
    const amount = Number(fixedForm.amount || 0)
    if (!fixedForm.name.trim() || amount <= 0) return
    setFixedExpenses((prev) => [...prev, { id: Date.now(), name: fixedForm.name.trim(), amount }])
    setFixedForm({ name: '', amount: '' })
  }

  const removeFixedExpense = (id) => {
    setFixedExpenses((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="app-shell">
      <div className="container">
        <div className="header">
          <div>
            <h1>Mi Presupuesto</h1>
            <p className="muted capitalize">{currentMonthLabel()}</p>
          </div>
          <span className="badge">Editable</span>
        </div>

        <div className="tabs">
          <TabButton active={tab === 'resumen'} onClick={() => setTab('resumen')}>Resumen</TabButton>
          <TabButton active={tab === 'seguimiento'} onClick={() => setTab('seguimiento')}>Seguimiento</TabButton>
          <TabButton active={tab === 'historial'} onClick={() => setTab('historial')}>Historial</TabButton>
          <TabButton active={tab === 'meta'} onClick={() => setTab('meta')}>Meta auto</TabButton>
        </div>

        {tab === 'resumen' && (
          <div className="stack">
            <KPI title="Ingreso" value={formatARS(income)} subtitle="Podés editarlo abajo" icon={Wallet} />
            <KPI title="Gastos fijos" value={formatARS(totalFixed)} subtitle={`${fixedExpenses.length} categorías activas`} icon={CalendarDays} />
            <KPI title="Disponible del mes" value={formatARS(availableForMonth)} subtitle={`Después de ahorrar ${formatARS(monthlySavingsTarget)}`} icon={PiggyBank} />

            <Card>
              <h2>Configuración rápida</h2>
              <div className="stack small-gap">
                <label className="field">
                  <span>Ingreso mensual</span>
                  <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value || 0))} />
                </label>
                <label className="field">
                  <span>Ahorro objetivo mensual</span>
                  <input type="number" value={monthlySavingsTarget} onChange={(e) => setMonthlySavingsTarget(Number(e.target.value || 0))} />
                </label>
              </div>

              <div className="divider" />

              <div className="section-title-row">
                <h3>Gastos fijos</h3>
                <span className="tiny muted">Editá nombre y monto</span>
              </div>

              <div className="stack small-gap">
                {fixedExpenses.map((item) => (
                  <div key={item.id} className="soft-card">
                    <label className="field">
                      <span>Nombre</span>
                      <input value={item.name} onChange={(e) => updateFixed(item.id, 'name', e.target.value)} />
                    </label>
                    <div className="row gap-sm align-end">
                      <label className="field grow">
                        <span>Monto</span>
                        <input type="number" value={item.amount} onChange={(e) => updateFixed(item.id, 'amount', e.target.value)} />
                      </label>
                      <button className="icon-btn" onClick={() => removeFixedExpense(item.id)} aria-label="Borrar gasto fijo">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="soft-panel">
                <h3>Agregar gasto fijo</h3>
                <label className="field">
                  <span>Nombre</span>
                  <input value={fixedForm.name} onChange={(e) => setFixedForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ej. Alquiler" />
                </label>
                <label className="field">
                  <span>Monto</span>
                  <input type="number" value={fixedForm.amount} onChange={(e) => setFixedForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="0" />
                </label>
                <button className="primary-btn full" onClick={addFixedExpense}><Plus size={16} /> Agregar gasto fijo</button>
              </div>
            </Card>

            <Card>
              <h2>Resumen real del mes</h2>
              <div className="summary-line"><span className="muted">Gasto variable cargado</span><strong>{formatARS(variableSpent)}</strong></div>
              <div className="summary-line"><span className="muted">Ahorro real posible</span><strong>{formatARS(realSavings)}</strong></div>
              <div className="summary-line"><span className="muted">Desvío vs meta de ahorro</span><strong className={monthBalance >= 0 ? 'good' : 'bad'}>{monthBalance >= 0 ? '+' : ''}{formatARS(monthBalance)}</strong></div>
            </Card>
          </div>
        )}

        {tab === 'seguimiento' && (
          <div className="stack">
            <KPI title="Tope semanal base" value={formatARS(weeklyBase)} subtitle="Sin contar arrastre" icon={TrendingUp} />

            <Card>
              <h2>Semanas con arrastre</h2>
              <div className="stack small-gap">
                {weeklyRows.map((row) => (
                  <div key={row.week} className="week-card">
                    <div className="row between align-start gap-sm">
                      <div>
                        <div className="week-title">Semana {row.week}</div>
                        <div className="tiny muted">Disponible con arrastre: {formatARS(row.available)}</div>
                      </div>
                      <span className={`status ${row.status}`}>{row.status === 'ok' ? 'bien' : row.status === 'warning' ? 'justo' : 'pasado'}</span>
                    </div>
                    <div className="grid-two">
                      <div className="mini-box"><span className="tiny muted">Gastado</span><strong>{formatARS(row.spent)}</strong></div>
                      <div className="mini-box"><span className="tiny muted">Sobrante / ajuste</span><strong className={row.balance >= 0 ? 'good' : 'bad'}>{row.balance >= 0 ? '+' : ''}{formatARS(row.balance)}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2>{editExpenseId ? 'Editar gasto' : 'Cargar gasto'}</h2>
              <div className="stack small-gap">
                <label className="field">
                  <span>Fecha</span>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
                <label className="field">
                  <span>Concepto</span>
                  <input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} placeholder="Ej. Uber, farmacia" />
                </label>
                <label className="field">
                  <span>Categoría</span>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Monto</span>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </label>
                <label className="field">
                  <span>Observaciones</span>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </label>
                <div className="row gap-sm">
                  <button className="primary-btn grow" onClick={saveExpense}>{editExpenseId ? <Save size={16} /> : <Plus size={16} />}{editExpenseId ? 'Guardar cambios' : 'Agregar gasto'}</button>
                  {editExpenseId ? <button className="secondary-btn" onClick={resetExpenseForm}><X size={16} /></button> : null}
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'historial' && (
          <div className="stack">
            <Card>
              <h2>Historial de gastos</h2>
              {history.length === 0 ? <p className="muted">Todavía no cargaste gastos.</p> : (
                <div className="stack small-gap">
                  {history.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map((item) => (
                    <div key={item.id} className="soft-card">
                      <div className="row between align-start gap-sm">
                        <div>
                          <div className="week-title">{item.concept}</div>
                          <div className="tiny muted">{new Date(item.date).toLocaleDateString('es-AR')} · {item.category} · semana {getWeekOfMonth(item.date)}</div>
                          {item.notes ? <div className="tiny muted mt4">{item.notes}</div> : null}
                        </div>
                        <strong>{formatARS(item.amount)}</strong>
                      </div>
                      <div className="row gap-sm mt12">
                        <button className="secondary-btn grow" onClick={() => startEditExpense(item)}><Pencil size={16} /> Editar</button>
                        <button className="icon-btn" onClick={() => removeExpense(item.id)} aria-label="Borrar gasto"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2>Gastos por categoría del mes</h2>
              {categoryTotals.length === 0 ? <p className="muted">No hay gastos cargados en este mes.</p> : (
                <div className="stack small-gap">
                  {categoryTotals.map((item) => (
                    <div className="summary-line" key={item.name}><span className="capitalize muted">{item.name}</span><strong>{formatARS(item.total)}</strong></div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === 'meta' && (
          <div className="stack">
            <KPI title="Meta auto" value={formatUSD(carUsdTarget)} subtitle={formatARS(carTargetArs)} icon={Car} />
            <Card>
              <h2>Objetivo de compra</h2>
              <div className="stack small-gap">
                <label className="field">
                  <span>Valor del auto en USD</span>
                  <input type="number" value={carUsdTarget} onChange={(e) => setCarUsdTarget(Number(e.target.value || 0))} />
                </label>
                <label className="field">
                  <span>Cotización de referencia</span>
                  <input type="number" value={usdRate} onChange={(e) => setUsdRate(Number(e.target.value || 0))} />
                </label>
                <label className="field">
                  <span>Ahorrado para el auto en pesos</span>
                  <input type="number" value={carSavedArs} onChange={(e) => setCarSavedArs(Number(e.target.value || 0))} />
                </label>
                <div className="summary-line"><span className="muted">Llevás ahorrado</span><strong>{formatARS(carSavedArs)} · {formatUSD(carSavedUsd)}</strong></div>
                <div className="progress"><div className="progress-bar" style={{ width: `${carProgress}%` }} /></div>
                <div className="tiny muted">{carProgress.toFixed(1)}% completado</div>
                <div className="divider" />
                <div className="summary-line"><span className="muted">Meses estimados para llegar</span><strong>{monthsToCar || 0}</strong></div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
