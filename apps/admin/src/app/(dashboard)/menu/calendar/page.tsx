'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWeekend,
  getDay,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  imageUrl: string | null
  available: boolean
}

interface DailyAssignment {
  date: string
  items: { id: string; menuItemId: string; menuItem: MenuItem }[]
  note?: string
}

interface WeeklyPatternDay {
  dayOfWeek: number
  items: { id: string; menuItemId: string; menuItem: MenuItem }[]
}

interface MenuTemplate {
  id: string
  name: string
  description: string | null
  color: string | null
  active: boolean
  itemCount: number
  items: { id: string; menuItemId: string; menuItem: MenuItem }[]
}

const WEEKDAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const WEEKDAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Draggable menu item component
function DraggableMenuItem({ item, type = 'item' }: { item: MenuItem | MenuTemplate; type?: 'item' | 'template' }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${type}-${item.id}`,
    data: { type, item },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined

  if (type === 'template') {
    const template = item as MenuTemplate
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`p-2 rounded-lg border cursor-grab active:cursor-grabbing ${
          isDragging ? 'ring-2 ring-blue-500' : ''
        }`}
        title={template.description || template.name}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: template.color || '#6B7280' }}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {template.name}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {template.itemCount} platos
        </div>
      </div>
    )
  }

  const menuItem = item as MenuItem
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-600 ${
        isDragging ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{menuItem.name}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">{menuItem.category || 'Sin categoría'}</span>
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{formatCurrency(menuItem.price)}</span>
      </div>
    </div>
  )
}

// Droppable calendar day component
function DroppableCalendarDay({
  date,
  currentMonth,
  assignment,
  patternDay,
  onClick,
  isSelected,
}: {
  date: Date
  currentMonth: Date
  assignment?: DailyAssignment
  patternDay?: WeeklyPatternDay
  onClick: () => void
  isSelected: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${format(date, 'yyyy-MM-dd')}`,
    data: { date: format(date, 'yyyy-MM-dd') },
  })

  const isCurrentMonth = isSameMonth(date, currentMonth)
  const isToday = isSameDay(date, new Date())
  const isWeekendDay = isWeekend(date)
  const hasAssignment = assignment && assignment.items.length > 0
  const hasPattern = patternDay && patternDay.items.length > 0
  const itemCount = hasAssignment ? assignment.items.length : hasPattern ? patternDay.items.length : 0

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`
        min-h-[80px] p-2 border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors
        ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50 text-gray-400' : ''}
        ${isWeekendDay && isCurrentMonth ? 'bg-gray-100 dark:bg-gray-800/50' : ''}
        ${isOver ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${isToday ? 'border-blue-500 border-2' : ''}
        hover:bg-blue-50 dark:hover:bg-blue-900/20
      `}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${
            isToday ? 'text-blue-600 dark:text-blue-400' : ''
          }`}
        >
          {format(date, 'd')}
        </span>
        {itemCount > 0 && (
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              hasAssignment
                ? 'bg-blue-500 text-white'
                : 'border-2 border-dashed border-green-500 text-green-600 dark:text-green-400'
            }`}
            title={hasAssignment ? `${itemCount} platos asignados` : `${itemCount} platos del patrón`}
          >
            {itemCount}
          </div>
        )}
      </div>
    </div>
  )
}

// Droppable pattern day column
function DroppablePatternDay({
  dayOfWeek,
  patternDay,
  onRemoveItem,
}: {
  dayOfWeek: number
  patternDay?: WeeklyPatternDay
  onRemoveItem: (menuItemId: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `pattern-${dayOfWeek}`,
    data: { type: 'pattern', dayOfWeek },
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-w-[150px] p-3 rounded-lg border border-gray-200 dark:border-gray-700
        ${isOver ? 'bg-green-100 dark:bg-green-900/30 border-green-400' : 'bg-white dark:bg-gray-800'}
      `}
    >
      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {WEEKDAY_NAMES_FULL[dayOfWeek]}
      </div>
      <div className="space-y-2">
        {patternDay?.items.map((item) => (
          <div
            key={item.id}
            className="p-2 bg-gray-50 dark:bg-gray-700 rounded flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                {item.menuItem.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatCurrency(item.menuItem.price)}
              </div>
            </div>
            <button
              onClick={() => onRemoveItem(item.menuItemId)}
              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {(!patternDay || patternDay.items.length === 0) && (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            Arrastra platos aquí
          </div>
        )}
      </div>
    </div>
  )
}

export default function MenuCalendarPage() {
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: MenuItem | MenuTemplate } | null>(null)
  const [showPatternSection, setShowPatternSection] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', color: '#3B82F6', menuItemIds: [] as string[] })

  // Get admin config (school and cafeteria) - dynamic cafeteriaId
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const response = await apiClient.admin.config()
      return response.data
    },
  })

  const cafeteriaId = configData?.data?.cafeteria?.id

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // Fetch menu items
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', cafeteriaId],
    queryFn: async () => {
      const response = await apiClient.menu.list(cafeteriaId!)
      return response.data
    },
    enabled: !!cafeteriaId,
  })

  // Fetch calendar assignments for current month
  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

  const { data: calendarData } = useQuery({
    queryKey: ['menuCalendar', cafeteriaId, monthStart, monthEnd],
    queryFn: async () => {
      const response = await apiClient.menuPlanning.getCalendar(cafeteriaId!, monthStart, monthEnd)
      return response.data
    },
    enabled: !!cafeteriaId,
  })

  // Fetch weekly pattern
  const { data: patternData } = useQuery({
    queryKey: ['weeklyPattern', cafeteriaId],
    queryFn: async () => {
      const response = await apiClient.menuPlanning.getWeeklyPattern(cafeteriaId!)
      return response.data
    },
    enabled: !!cafeteriaId,
  })

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['menuTemplates', cafeteriaId],
    queryFn: async () => {
      const response = await apiClient.menuTemplates.list(cafeteriaId!)
      return response.data
    },
    enabled: !!cafeteriaId,
  })

  // Mutation for setting date menu
  const setDateMenuMutation = useMutation({
    mutationFn: async ({ date, menuItemIds, note }: { date: string; menuItemIds: string[]; note?: string }) => {
      return apiClient.menuPlanning.setDateMenu(cafeteriaId!, date, menuItemIds, note)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCalendar', cafeteriaId!] })
    },
    onError: (error) => {
      console.error('Error al actualizar menu:', error)
      alert('Error al actualizar el menu. Por favor intenta de nuevo.')
    },
  })

  // Mutation for clearing date menu
  const clearDateMenuMutation = useMutation({
    mutationFn: async (date: string) => {
      return apiClient.menuPlanning.clearDateMenu(cafeteriaId!, date)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCalendar', cafeteriaId!] })
      setSelectedDate(null)
    },
    onError: (error) => {
      console.error('Error al limpiar menu:', error)
      alert('Error al limpiar el menu. Por favor intenta de nuevo.')
    },
  })

  // Mutation for updating pattern day
  const updatePatternDayMutation = useMutation({
    mutationFn: async ({ dayOfWeek, menuItemIds }: { dayOfWeek: number; menuItemIds: string[] }) => {
      return apiClient.menuPlanning.updatePatternDay(cafeteriaId!, dayOfWeek, menuItemIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPattern', cafeteriaId!] })
    },
    onError: (error) => {
      console.error('Error al actualizar patron:', error)
      alert('Error al actualizar el patron semanal. Por favor intenta de nuevo.')
    },
  })

  // Mutation for creating template
  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string; menuItemIds?: string[] }) => {
      return apiClient.menuTemplates.create(cafeteriaId!, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuTemplates', cafeteriaId!] })
      setShowTemplateModal(false)
      setNewTemplate({ name: '', description: '', color: '#3B82F6', menuItemIds: [] })
    },
  })

  // Extract data
  const menuItems: MenuItem[] = useMemo(() => {
    const items = Array.isArray(menuData?.data?.items) ? menuData.data.items : []
    return items.filter((item: MenuItem) => item.available)
  }, [menuData])

  const assignments: Record<string, DailyAssignment> = useMemo(() => {
    const assignmentsList = calendarData?.data?.assignments || []
    const map: Record<string, DailyAssignment> = {}
    assignmentsList.forEach((a: DailyAssignment) => {
      map[a.date] = a
    })
    return map
  }, [calendarData])

  const weeklyPattern: Record<number, WeeklyPatternDay> = useMemo(() => {
    const days = patternData?.data?.days || []
    const map: Record<number, WeeklyPatternDay> = {}
    days.forEach((d: WeeklyPatternDay) => {
      map[d.dayOfWeek] = d
    })
    return map
  }, [patternData])

  const templates: MenuTemplate[] = useMemo(() => {
    return templatesData?.data?.templates || []
  }, [templatesData])

  const categories = useMemo(() => {
    return [...new Set(menuItems.map((item) => item.category).filter(Boolean))]
  }, [menuItems])

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (filterCategory && item.category !== filterCategory) return false
      return true
    })
  }, [menuItems, searchTerm, filterCategory])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    const days: Date[] = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  // Get assignment or pattern for selected date
  const selectedDateData = useMemo(() => {
    if (!selectedDate) return null
    const assignment = assignments[selectedDate]
    const dayOfWeek = getDay(parseISO(selectedDate))
    const pattern = weeklyPattern[dayOfWeek]
    return {
      assignment,
      pattern,
      hasAssignment: assignment && assignment.items.length > 0,
      hasPattern: pattern && pattern.items.length > 0,
      items: assignment?.items.length ? assignment.items : pattern?.items || [],
      source: assignment?.items.length ? 'assignment' : pattern?.items.length ? 'pattern' : null,
    }
  }, [selectedDate, assignments, weeklyPattern])

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null)
    const { active, over } = event
    if (!over) return

    const dragData = active.data.current as { type: string; item: MenuItem | MenuTemplate }
    const dropId = over.id as string

    // Dropping on a calendar day
    if (dropId.startsWith('day-')) {
      const date = dropId.replace('day-', '')
      const existingAssignment = assignments[date]
      const existingIds = existingAssignment?.items.map((i) => i.menuItemId) || []

      if (dragData.type === 'item') {
        const menuItem = dragData.item as MenuItem
        if (!existingIds.includes(menuItem.id)) {
          setDateMenuMutation.mutate({ date, menuItemIds: [...existingIds, menuItem.id] })
        }
      } else if (dragData.type === 'template') {
        const template = dragData.item as MenuTemplate
        const templateItemIds = template.items.map((i) => i.menuItemId)
        const newIds = [...new Set([...existingIds, ...templateItemIds])]
        setDateMenuMutation.mutate({ date, menuItemIds: newIds })
      }
    }

    // Dropping on a pattern day
    if (dropId.startsWith('pattern-')) {
      const dayOfWeek = parseInt(dropId.replace('pattern-', ''), 10)
      const existingPattern = weeklyPattern[dayOfWeek]
      const existingIds = existingPattern?.items.map((i) => i.menuItemId) || []

      if (dragData.type === 'item') {
        const menuItem = dragData.item as MenuItem
        if (!existingIds.includes(menuItem.id)) {
          updatePatternDayMutation.mutate({ dayOfWeek, menuItemIds: [...existingIds, menuItem.id] })
        }
      } else if (dragData.type === 'template') {
        const template = dragData.item as MenuTemplate
        const templateItemIds = template.items.map((i) => i.menuItemId)
        const newIds = [...new Set([...existingIds, ...templateItemIds])]
        updatePatternDayMutation.mutate({ dayOfWeek, menuItemIds: newIds })
      }
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const dragData = event.active.data.current as { type: string; item: MenuItem | MenuTemplate }
    setActiveDragItem(dragData)
  }

  // Remove item from selected date
  const handleRemoveItemFromDate = (menuItemId: string) => {
    if (!selectedDate || !selectedDateData?.assignment) return
    const newIds = selectedDateData.assignment.items
      .filter((i) => i.menuItemId !== menuItemId)
      .map((i) => i.menuItemId)
    if (newIds.length === 0) {
      clearDateMenuMutation.mutate(selectedDate)
    } else {
      setDateMenuMutation.mutate({ date: selectedDate, menuItemIds: newIds })
    }
  }

  // Remove item from pattern day
  const handleRemoveItemFromPattern = (dayOfWeek: number, menuItemId: string) => {
    const pattern = weeklyPattern[dayOfWeek]
    if (!pattern) return
    const newIds = pattern.items.filter((i) => i.menuItemId !== menuItemId).map((i) => i.menuItemId)
    updatePatternDayMutation.mutate({ dayOfWeek, menuItemIds: newIds })
  }

  // Use pattern for selected date
  const handleUsePattern = () => {
    if (!selectedDate) return
    const dayOfWeek = getDay(parseISO(selectedDate))
    const pattern = weeklyPattern[dayOfWeek]
    if (pattern && pattern.items.length > 0) {
      const itemIds = pattern.items.map((i) => i.menuItemId)
      setDateMenuMutation.mutate({ date: selectedDate, menuItemIds: itemIds })
    }
  }

  if (configLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!cafeteriaId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sin cafetería configurada</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          No se encontró una cafetería asociada a tu cuenta.
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Calendario de Menú
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Planifica el menú arrastrando platos al calendario
            </p>
          </div>
        </div>

        {/* Main Content: Calendar + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Section (70%) */}
          <div className="lg:w-[70%] space-y-4">
            {/* Month Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const dayOfWeek = getDay(date)
                  return (
                    <DroppableCalendarDay
                      key={dateStr}
                      date={date}
                      currentMonth={currentMonth}
                      assignment={assignments[dateStr]}
                      patternDay={weeklyPattern[dayOfWeek]}
                      onClick={() => setSelectedDate(dateStr)}
                      isSelected={selectedDate === dateStr}
                    />
                  )
                })}
              </div>
            </div>

            {/* Weekly Pattern Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowPatternSection(!showPatternSection)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Patrón Semanal
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    (se aplica cuando no hay asignación específica)
                  </span>
                </div>
                {showPatternSection ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {showPatternSection && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {[1, 2, 3, 4, 5].map((dayOfWeek) => (
                      <DroppablePatternDay
                        key={dayOfWeek}
                        dayOfWeek={dayOfWeek}
                        patternDay={weeklyPattern[dayOfWeek]}
                        onRemoveItem={(menuItemId) => handleRemoveItemFromPattern(dayOfWeek, menuItemId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (30%) */}
          <div className="lg:w-[30%] space-y-4">
            {/* Dishes Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Platos Disponibles
              </h3>

              {/* Search */}
              <input
                type="text"
                placeholder="Buscar platos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat || ''}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Menu Items List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredMenuItems.map((item) => (
                  <DraggableMenuItem key={item.id} item={item} type="item" />
                ))}
                {filteredMenuItems.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No hay platos disponibles
                  </div>
                )}
              </div>
            </div>

            {/* Templates Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Templates</h3>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  + Nuevo
                </button>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {templates.map((template) => (
                  <DraggableMenuItem key={template.id} item={template} type="template" />
                ))}
                {templates.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No hay templates
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Day Detail Modal */}
        {selectedDate && selectedDateData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg m-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: es })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedDateData.source && (
                <div className="mb-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      selectedDateData.source === 'assignment'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    {selectedDateData.source === 'assignment' ? 'Asignación específica' : 'Patrón semanal'}
                  </span>
                </div>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
                {selectedDateData.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.menuItem.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(item.menuItem.price)}
                      </div>
                    </div>
                    {selectedDateData.source === 'assignment' && (
                      <button
                        onClick={() => handleRemoveItemFromDate(item.menuItemId)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {selectedDateData.items.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Sin menú asignado
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!selectedDateData.hasAssignment && selectedDateData.hasPattern && (
                  <button
                    onClick={handleUsePattern}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Usar Patrón Semanal
                  </button>
                )}
                {selectedDateData.hasAssignment && (
                  <button
                    onClick={() => clearDateMenuMutation.mutate(selectedDate)}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Limpiar Asignación
                  </button>
                )}
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg m-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Nuevo Template
                </h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Ej: Menú del día"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Descripción opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTemplate({ ...newTemplate, color })}
                        className={`w-8 h-8 rounded-full ${
                          newTemplate.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seleccionar Platos
                  </label>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                    {menuItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newTemplate.menuItemIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTemplate({
                                ...newTemplate,
                                menuItemIds: [...newTemplate.menuItemIds, item.id],
                              })
                            } else {
                              setNewTemplate({
                                ...newTemplate,
                                menuItemIds: newTemplate.menuItemIds.filter((id) => id !== item.id),
                              })
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{item.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                          {formatCurrency(item.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {newTemplate.menuItemIds.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {newTemplate.menuItemIds.length} platos seleccionados
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    if (newTemplate.name.trim()) {
                      createTemplateMutation.mutate({
                        name: newTemplate.name,
                        description: newTemplate.description || undefined,
                        color: newTemplate.color,
                        menuItemIds: newTemplate.menuItemIds,
                      })
                    }
                  }}
                  disabled={!newTemplate.name.trim() || createTemplateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createTemplateMutation.isPending ? 'Guardando...' : 'Guardar Template'}
                </button>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragItem && (
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-blue-400 shadow-lg">
              {activeDragItem.type === 'item' ? (
                <>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {(activeDragItem.item as MenuItem).name}
                  </div>
                  <div className="text-xs text-blue-600">
                    {formatCurrency((activeDragItem.item as MenuItem).price)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {(activeDragItem.item as MenuTemplate).name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(activeDragItem.item as MenuTemplate).itemCount} platos
                  </div>
                </>
              )}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
