'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiService, type Student, type MenuItem } from '@/lib/api';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Cafeteria {
  id: string;
  name: string;
  schoolName: string;
}

interface CafeteriaState {
  loading: boolean;
  cafeteria: Cafeteria | null;
  menuItems: MenuItem[];
  selectedDay: number;
  weekOffset: number;
  students: Student[];
  selectedStudent: Student | null;
  error: string | null;
}

type CafeteriaAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CAFETERIA'; payload: Cafeteria | null }
  | { type: 'SET_MENU_ITEMS'; payload: MenuItem[] }
  | { type: 'SET_SELECTED_DAY'; payload: number }
  | { type: 'SET_WEEK_OFFSET'; payload: number }
  | { type: 'SET_STUDENTS'; payload: Student[] }
  | { type: 'SET_SELECTED_STUDENT'; payload: Student | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DATA'; payload: Partial<CafeteriaState> };

function cafeteriaReducer(state: CafeteriaState, action: CafeteriaAction): CafeteriaState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CAFETERIA':
      return { ...state, cafeteria: action.payload };
    case 'SET_MENU_ITEMS':
      return { ...state, menuItems: action.payload };
    case 'SET_SELECTED_DAY':
      return { ...state, selectedDay: action.payload };
    case 'SET_WEEK_OFFSET':
      return { ...state, weekOffset: action.payload };
    case 'SET_STUDENTS':
      return { ...state, students: action.payload };
    case 'SET_SELECTED_STUDENT':
      return { ...state, selectedStudent: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const initialState: CafeteriaState = {
  loading: true,
  cafeteria: null,
  menuItems: [],
  selectedDay: new Date().getDay() || 7,
  weekOffset: 0,
  students: [],
  selectedStudent: null,
  error: null,
};

const dayNames = ['', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const fullDayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export default function CafeteriaPage() {
  const { accessToken } = useAuthStore();
  const [state, dispatch] = useReducer(cafeteriaReducer, initialState);

  // Get the start and end dates for the current week view
  const getWeekDateRange = useCallback(() => {
    const today = new Date();
    const currentDay = today.getDay() || 7;

    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay - 1) + (state.weekOffset * 7));

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return { monday, friday };
  }, [state.weekOffset]);

  // Get date for a specific day in the current week view
  const getDayDate = useCallback((day: number): Date => {
    const { monday } = getWeekDateRange();
    const date = new Date(monday);
    date.setDate(monday.getDate() + (day - 1));
    return date;
  }, [getWeekDateRange]);

  // Format date for display
  const formatShortDate = (date: Date): string => {
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  // Get full date string for a specific day (YYYY-MM-DD format)
  const getDateString = useCallback((day: number): string => {
    const date = getDayDate(day);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayNum = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayNum}`;
  }, [getDayDate]);

  const loadMenuForDay = useCallback(async (cafeteriaId: string, day: number) => {
    if (!accessToken) return;

    try {
      const dateStr = getDateString(day);
      const response = await apiService.getMenuByDate(cafeteriaId, dateStr, accessToken);

      if (response.success && response.data) {
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        const menuItemsList: MenuItem[] = items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          imageUrl: item.imageUrl,
          available: true,
          availableDays: [day],
        }));
        dispatch({ type: 'SET_MENU_ITEMS', payload: menuItemsList });
      } else {
        dispatch({ type: 'SET_MENU_ITEMS', payload: [] });
      }
    } catch {
      dispatch({ type: 'SET_MENU_ITEMS', payload: [] });
    }
  }, [accessToken, getDateString]);

  // Load students and find cafeteria
  const loadData = useCallback(async () => {
    if (!accessToken) return;

    try {
      dispatch({ type: 'SET_DATA', payload: { loading: true, error: null } });

      const studentsResponse = await apiService.getStudents(accessToken);
      if (!studentsResponse.success) {
        dispatch({ type: 'SET_ERROR', payload: studentsResponse.message || 'Error al cargar datos' });
        return;
      }

      if (studentsResponse.success && studentsResponse.data) {
        const studentList = Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : [];
        dispatch({ type: 'SET_STUDENTS', payload: studentList });

        if (studentList.length > 0) {
          dispatch({ type: 'SET_SELECTED_STUDENT', payload: studentList[0] });

          const studentResponse = await apiService.getStudent(studentList[0].id, accessToken);
          if (studentResponse.success && studentResponse.data) {
            const studentData = studentResponse.data as Student & { cafeteria?: { id: string; name: string } };

            if (studentData.cafeteria) {
              const cafeteriaData = {
                id: studentData.cafeteria.id,
                name: studentData.cafeteria.name,
                schoolName: studentData.school.name,
              };
              dispatch({ type: 'SET_CAFETERIA', payload: cafeteriaData });

              await loadMenuForDay(studentData.cafeteria.id, state.selectedDay);
            }
          }
        }
      }
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Error de conexion. Verifica tu internet.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [accessToken, state.selectedDay, loadMenuForDay]);

  useEffect(() => {
    loadData();
  }, []);

  // Reload menu when week changes
  useEffect(() => {
    if (state.cafeteria) {
      loadMenuForDay(state.cafeteria.id, state.selectedDay);
    }
  }, [state.weekOffset, state.cafeteria?.id, state.selectedDay, loadMenuForDay]);

  const handlePreviousWeek = () => {
    if (state.weekOffset > 0) {
      dispatch({ type: 'SET_WEEK_OFFSET', payload: state.weekOffset - 1 });
    }
  };

  const handleNextWeek = () => {
    if (state.weekOffset < 4) {
      dispatch({ type: 'SET_WEEK_OFFSET', payload: state.weekOffset + 1 });
    }
  };

  const handleDaySelect = async (day: number) => {
    dispatch({ type: 'SET_SELECTED_DAY', payload: day });
    if (state.cafeteria) {
      await loadMenuForDay(state.cafeteria.id, day);
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Cargando menu...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-error mb-4">{state.error}</p>
        <Button onClick={loadData}>Reintentar</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Menu del Dia</h1>
        <p className="text-text-secondary">
          {state.cafeteria ? state.cafeteria.name : 'Menu del casino escolar'}
        </p>
      </div>

      {/* Student selector */}
      {state.students.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium text-text-secondary mb-3">Viendo menu para:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {state.students.map(student => (
              <button
                key={student.id}
                onClick={() => dispatch({ type: 'SET_SELECTED_STUDENT', payload: student })}
                className={cn(
                  'px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors',
                  state.selectedStudent?.id === student.id
                    ? 'bg-primary text-white font-medium'
                    : 'bg-surface text-text-secondary hover:bg-border'
                )}
              >
                {student.firstName}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Week selector with navigation */}
      <Card className="p-4">
        {/* Week navigation header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePreviousWeek}
            disabled={state.weekOffset === 0}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center bg-surface transition-colors',
              state.weekOffset === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-border'
            )}
          >
            <ChevronLeft className={cn(
              'h-6 w-6',
              state.weekOffset === 0 ? 'text-text-secondary' : 'text-primary'
            )} />
          </button>

          <div className="text-center">
            <p className="font-semibold text-text">
              {state.weekOffset === 0
                ? 'Esta semana'
                : state.weekOffset === 1
                  ? 'Proxima semana'
                  : `En ${state.weekOffset} semanas`}
            </p>
            <p className="text-sm text-text-secondary">
              {formatShortDate(getWeekDateRange().monday)} - {formatShortDate(getWeekDateRange().friday)}
            </p>
          </div>

          <button
            onClick={handleNextWeek}
            disabled={state.weekOffset >= 4}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center bg-surface transition-colors',
              state.weekOffset >= 4 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-border'
            )}
          >
            <ChevronRight className={cn(
              'h-6 w-6',
              state.weekOffset >= 4 ? 'text-text-secondary' : 'text-primary'
            )} />
          </button>
        </div>

        {/* Day selector */}
        <p className="text-sm text-text-secondary text-center mb-3">Selecciona el dia</p>
        <div className="flex justify-around">
          {[1, 2, 3, 4, 5].map((day) => (
            <button
              key={day}
              onClick={() => handleDaySelect(day)}
              className={cn(
                'w-13 h-14 rounded-xl flex flex-col items-center justify-center transition-colors',
                state.selectedDay === day
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-border'
              )}
            >
              <span className="text-xs font-semibold">{dayNames[day]}</span>
              <span className="text-base font-bold">{getDayDate(day).getDate()}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Menu items */}
      {state.menuItems.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text">
            Menu para {fullDayNames[state.selectedDay]}
          </h2>
          {state.menuItems.map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-text">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-text-secondary mt-1">{item.description}</p>
                  )}
                  <p className="text-sm font-semibold text-primary mt-2">
                    ${item.price.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">&#128237;</div>
          <h3 className="text-lg font-semibold text-text mb-2">No hay menu disponible</h3>
          <p className="text-text-secondary">
            {state.cafeteria
              ? `No hay items de menu disponibles para ${fullDayNames[state.selectedDay]}.`
              : 'No se encontro una cafeteria para el colegio de tu hijo.'}
          </p>
        </Card>
      )}
    </div>
  );
}
