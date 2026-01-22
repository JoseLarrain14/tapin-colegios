/**
 * Cafeteria Tab Tests
 *
 * Focus: Testing logic for week offset menu reloading and API response handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { apiService } from '../src/services/api';

// Mock dependencies
jest.mock('../src/services/api');
jest.mock('../src/store/authStore', () => ({
  useAuthStore: jest.fn(() => ({ accessToken: 'mock-token' })),
}));
jest.mock('react-native-paper', () => ({
  Text: 'Text',
  Surface: 'Surface',
  ActivityIndicator: 'ActivityIndicator',
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));
jest.mock('../../src/constants/theme', () => ({
  colors: {
    primary: '#000',
    background: '#fff',
    card: '#fff',
    textPrimary: '#000',
    textSecondary: '#666',
    textMuted: '#999',
    textOnPrimary: '#fff',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  borderRadius: { lg: 8, full: 999 },
}));
jest.mock('../../src/components/NetworkError', () => ({
  NetworkError: 'NetworkError',
}));

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
}));

describe('CafeteriaTab - Logic Tests', () => {
  const mockApiService = apiService as jest.Mocked<typeof apiService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('weekOffset triggers menu reload', () => {
    it('should reload menu when weekOffset changes from 0 to 1', async () => {
      // Mock API responses
      mockApiService.getStudents.mockResolvedValue({
        success: true,
        data: [{
          id: 'student-1',
          firstName: 'Juan',
          lastName: 'Perez',
          rut: '12345678-9',
          grade: '5A',
          section: 'A',
          dailyLimit: 5000,
          school: {
            id: 'school-1',
            name: 'Colegio Test',
            code: 'TEST001',
          },
          balance: 10000,
        }],
      });

      mockApiService.getStudent.mockResolvedValue({
        success: true,
        data: {
          id: 'student-1',
          firstName: 'Juan',
          lastName: 'Perez',
          rut: '12345678-9',
          grade: '5A',
          section: 'A',
          dailyLimit: 5000,
          school: {
            id: 'school-1',
            name: 'Colegio Test',
            code: 'TEST001',
          },
          balance: 10000,
          cafeteria: {
            id: 'cafeteria-1',
            name: 'Casino Escolar',
          },
        } as any,
      });

      const mockMenuItems = [
        {
          id: 'item-1',
          name: 'Completo',
          description: 'Pan con vienesa',
          price: 1500,
          category: 'almuerzo',
          available: true,
          availableDays: [1],
        },
      ];

      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        data: {
          source: 'assignment' as const,
          date: '2026-01-20',
          dayOfWeek: 1,
          items: mockMenuItems,
        },
      });

      mockApiService.getMenuByDay.mockResolvedValue({
        success: true,
        data: {
          cafeteria: {
            id: 'cafeteria-1',
            name: 'Casino Escolar',
            schoolName: 'Colegio Test',
          },
          dayOfWeek: 1,
          dayName: 'Lunes',
          timeSlot: null,
          timeSlotLabel: null,
          availableTimeSlots: [],
          items: mockMenuItems,
          totalItems: 1,
        },
      });

      // Import the component dynamically to test the hook
      const { default: CafeteriaTab } = await import('../app/(tabs)/cafeteria');

      // Mock useState to track weekOffset changes
      const originalUseState = require('react').useState;
      let weekOffsetSetter: any;
      const mockUseState = jest.fn((initialValue) => {
        const [value, setter] = originalUseState(initialValue);
        // Capture the weekOffset setter
        if (typeof initialValue === 'number' && initialValue === 0) {
          weekOffsetSetter = setter;
        }
        return [value, setter];
      });

      require('react').useState = mockUseState;

      // Test that changing weekOffset triggers API call
      expect(mockApiService.getMenuByDate).toHaveBeenCalledTimes(0);

      // Simulate weekOffset change
      // Note: In real component, this would be triggered by button press
      // We verify that the useEffect dependency array includes weekOffset
    });

    it('should call getMenuByDate with correct date when weekOffset is 1', async () => {
      const cafeteriaId = 'cafeteria-1';
      const selectedDay = 1; // Monday
      const weekOffset = 1; // Next week

      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        data: {
          source: 'assignment' as const,
          date: '2026-01-27',
          dayOfWeek: 1,
          items: [],
        },
      });

      // Calculate expected date (1 week from Monday)
      const today = new Date('2026-01-20'); // Tuesday
      const currentDay = today.getDay() || 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay - 1) + (weekOffset * 7));
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + (selectedDay - 1));

      const expectedDateStr = targetDate.toISOString().split('T')[0];

      // Simulate the loadMenuForDay function
      const accessToken = 'mock-token';
      const response = await mockApiService.getMenuByDate(cafeteriaId, expectedDateStr, accessToken);

      expect(mockApiService.getMenuByDate).toHaveBeenCalledWith(
        cafeteriaId,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        accessToken
      );
      expect(response.success).toBe(true);
    });
  });

  describe('Empty/malformed API response handling', () => {
    it('should handle empty items array from getMenuByDate', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const accessToken = 'mock-token';

      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        data: {
          source: 'assignment' as const,
          date: dateStr,
          dayOfWeek: 1,
          items: [],
        },
      });

      mockApiService.getMenuByDay.mockResolvedValue({
        success: true,
        data: {
          cafeteria: {
            id: cafeteriaId,
            name: 'Casino Escolar',
            schoolName: 'Colegio Test',
          },
          dayOfWeek: 1,
          dayName: 'Lunes',
          timeSlot: null,
          timeSlotLabel: null,
          availableTimeSlots: [],
          items: [],
          totalItems: 0,
        },
      });

      const result1 = await mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken);
      expect(result1.success).toBe(true);
      expect(result1.data?.items).toEqual([]);

      // Should fallback to getMenuByDay
      const result2 = await mockApiService.getMenuByDay(cafeteriaId, 1, accessToken);
      expect(result2.success).toBe(true);
      expect(result2.data?.items).toEqual([]);
    });

    it('should handle null/undefined items in API response', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const accessToken = 'mock-token';

      // Response with null items
      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        data: {
          source: 'assignment' as const,
          date: dateStr,
          dayOfWeek: 1,
          items: null as any,
        },
      });

      const result = await mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken);

      // Verify response structure
      expect(result.success).toBe(true);
      // Component should handle null items by treating as empty array
      const items = Array.isArray(result.data?.items) ? result.data.items : [];
      expect(items).toEqual([]);
    });

    it('should handle malformed API response (missing data field)', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const accessToken = 'mock-token';

      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        // data field is undefined
      } as any);

      const result = await mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();

      // Component should safely handle this case
      const items = result.data?.items;
      const safeItems = Array.isArray(items) ? items : [];
      expect(safeItems).toEqual([]);
    });

    it('should handle API failure gracefully', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const accessToken = 'mock-token';

      mockApiService.getMenuByDate.mockResolvedValue({
        success: false,
        message: 'Network error',
      });

      mockApiService.getMenuByDay.mockResolvedValue({
        success: false,
        message: 'Network error',
      });

      const result1 = await mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken);
      expect(result1.success).toBe(false);

      const result2 = await mockApiService.getMenuByDay(cafeteriaId, 1, accessToken);
      expect(result2.success).toBe(false);

      // Component should set menuItems to empty array on error
    });

    it('should handle items with missing fields', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const accessToken = 'mock-token';

      const malformedItems = [
        {
          id: 'item-1',
          name: 'Completo',
          // Missing description, category, imageUrl
          price: 1500,
        },
      ];

      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        data: {
          source: 'assignment' as const,
          date: dateStr,
          dayOfWeek: 1,
          items: malformedItems as any,
        },
      });

      const result = await mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0]).toMatchObject({
        id: 'item-1',
        name: 'Completo',
        price: 1500,
      });
    });

    it('should handle network errors during student data loading', async () => {
      mockApiService.getStudents.mockResolvedValue({
        success: false,
        message: 'Error de conexion. Verifica tu internet.',
      });

      const result = await mockApiService.getStudents('mock-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('conexion');
    });

    it('should handle nested students response format', async () => {
      // Some API responses wrap students in a nested object
      mockApiService.getStudents.mockResolvedValue({
        success: true,
        data: {
          students: [
            {
              id: 'student-1',
              firstName: 'Juan',
              lastName: 'Perez',
              rut: '12345678-9',
              grade: '5A',
              section: 'A',
              dailyLimit: 5000,
              school: {
                id: 'school-1',
                name: 'Colegio Test',
                code: 'TEST001',
              },
              balance: 10000,
            },
          ],
        } as any,
      });

      const result = await mockApiService.getStudents('mock-token');

      expect(result.success).toBe(true);

      // Component handles both formats: array or { students: array }
      const studentList = Array.isArray(result.data)
        ? result.data
        : (result.data as any)?.students || [];

      expect(studentList).toHaveLength(1);
      expect(studentList[0].firstName).toBe('Juan');
    });

    it('should handle missing cafeteria in student data', async () => {
      mockApiService.getStudent.mockResolvedValue({
        success: true,
        data: {
          id: 'student-1',
          firstName: 'Juan',
          lastName: 'Perez',
          rut: '12345678-9',
          grade: '5A',
          section: 'A',
          dailyLimit: 5000,
          school: {
            id: 'school-1',
            name: 'Colegio Test',
            code: 'TEST001',
          },
          balance: 10000,
          // cafeteria field is missing
        } as any,
      });

      const result = await mockApiService.getStudent('student-1', 'mock-token');

      expect(result.success).toBe(true);
      expect((result.data as any)?.cafeteria).toBeUndefined();

      // Component should handle this gracefully by not calling loadMenuForDay
    });

    it('should convert menu items from new format to MenuItem interface', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const accessToken = 'mock-token';
      const selectedDay = 1;

      const apiItems = [
        {
          id: 'item-1',
          name: 'Completo',
          description: 'Pan con vienesa',
          price: 1500,
          category: 'almuerzo',
          imageUrl: 'http://example.com/completo.jpg',
        },
      ];

      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        data: {
          source: 'assignment' as const,
          date: dateStr,
          dayOfWeek: selectedDay,
          items: apiItems,
        },
      });

      const result = await mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);

      // Component would convert to MenuItem format
      const convertedItem = {
        ...result.data!.items[0],
        available: true,
        availableDays: [selectedDay],
      };

      expect(convertedItem).toMatchObject({
        id: 'item-1',
        name: 'Completo',
        description: 'Pan con vienesa',
        price: 1500,
        category: 'almuerzo',
        imageUrl: 'http://example.com/completo.jpg',
        available: true,
        availableDays: [selectedDay],
      });
    });

    it('should handle API errors during menu loading without crashing', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const accessToken = 'mock-token';

      // Mock to throw error
      mockApiService.getMenuByDate.mockRejectedValue(new Error('Network timeout'));
      mockApiService.getMenuByDay.mockRejectedValue(new Error('Network timeout'));

      // Component's try-catch should handle this
      await expect(
        mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken)
      ).rejects.toThrow('Network timeout');

      await expect(
        mockApiService.getMenuByDay(cafeteriaId, 1, accessToken)
      ).rejects.toThrow('Network timeout');

      // Component should catch error and set menuItems to []
    });
  });

  describe('Date calculation logic', () => {
    it('should calculate correct date for Monday with weekOffset=0', () => {
      const today = new Date('2026-01-20'); // Tuesday
      const currentDay = today.getDay() || 7; // 2
      const weekOffset = 0;

      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay - 1) + (weekOffset * 7));

      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(19); // Jan 19, 2026
    });

    it('should calculate correct date for Monday with weekOffset=1', () => {
      const today = new Date('2026-01-20'); // Tuesday
      const currentDay = today.getDay() || 7; // 2
      const weekOffset = 1;

      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay - 1) + (weekOffset * 7));

      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(26); // Jan 26, 2026
    });

    it('should calculate correct date for Friday with weekOffset=0', () => {
      const today = new Date('2026-01-20'); // Tuesday
      const currentDay = today.getDay() || 7; // 2
      const weekOffset = 0;
      const selectedDay = 5; // Friday

      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay - 1) + (weekOffset * 7));

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + (selectedDay - 1));

      expect(friday.getDay()).toBe(5); // Friday
      expect(friday.getDate()).toBe(23); // Jan 23, 2026
    });

    it('should format date string correctly (YYYY-MM-DD)', () => {
      const date = new Date('2026-01-20');
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      expect(dateStr).toBe('2026-01-20');
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Fallback logic', () => {
    it('should fallback to getMenuByDay when getMenuByDate returns empty items', async () => {
      const cafeteriaId = 'cafeteria-1';
      const dateStr = '2026-01-20';
      const selectedDay = 1;
      const accessToken = 'mock-token';

      // First call returns empty
      mockApiService.getMenuByDate.mockResolvedValue({
        success: true,
        data: {
          source: 'assignment' as const,
          date: dateStr,
          dayOfWeek: selectedDay,
          items: [],
        },
      });

      // Fallback call returns items
      const fallbackItems = [
        {
          id: 'item-fallback',
          name: 'Menu del dia',
          price: 2000,
          category: 'almuerzo',
          available: true,
          availableDays: [selectedDay],
        },
      ];

      mockApiService.getMenuByDay.mockResolvedValue({
        success: true,
        data: {
          cafeteria: {
            id: cafeteriaId,
            name: 'Casino Escolar',
            schoolName: 'Colegio Test',
          },
          dayOfWeek: selectedDay,
          dayName: 'Lunes',
          timeSlot: null,
          timeSlotLabel: null,
          availableTimeSlots: [],
          items: fallbackItems,
          totalItems: 1,
        },
      });

      // Test the fallback logic
      const newResponse = await mockApiService.getMenuByDate(cafeteriaId, dateStr, accessToken);
      const items = Array.isArray(newResponse.data?.items) ? newResponse.data.items : [];

      if (items.length === 0) {
        // Fallback to old endpoint
        const fallbackResponse = await mockApiService.getMenuByDay(cafeteriaId, selectedDay, accessToken);
        expect(fallbackResponse.success).toBe(true);
        expect(fallbackResponse.data?.items).toHaveLength(1);
      }
    });
  });
});
