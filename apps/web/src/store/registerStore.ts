import { create } from 'zustand';
import { School } from '../lib/api';

export type RelationshipType = 'father' | 'mother' | 'guardian' | 'other';

interface RegisterFormData {
  relationship: RelationshipType | null;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  selectedSchool: School | null;
}

interface RegisterState {
  formData: RegisterFormData;
  currentStep: number;

  // Actions
  setRelationship: (relationship: RelationshipType) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;
  setAcceptTerms: (accept: boolean) => void;
  setSelectedSchool: (school: School) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
  getRegisterData: () => {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    relationship: RelationshipType;
  } | null;
}

const initialFormData: RegisterFormData = {
  relationship: null,
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  acceptTerms: false,
  selectedSchool: null,
};

export const useRegisterStore = create<RegisterState>((set, get) => ({
  formData: { ...initialFormData },
  currentStep: 1,

  setRelationship: (relationship) =>
    set((state) => ({
      formData: { ...state.formData, relationship }
    })),

  setEmail: (email) =>
    set((state) => ({
      formData: { ...state.formData, email }
    })),

  setPassword: (password) =>
    set((state) => ({
      formData: { ...state.formData, password }
    })),

  setConfirmPassword: (confirmPassword) =>
    set((state) => ({
      formData: { ...state.formData, confirmPassword }
    })),

  setFirstName: (firstName) =>
    set((state) => ({
      formData: { ...state.formData, firstName }
    })),

  setLastName: (lastName) =>
    set((state) => ({
      formData: { ...state.formData, lastName }
    })),

  setAcceptTerms: (acceptTerms) =>
    set((state) => ({
      formData: { ...state.formData, acceptTerms }
    })),

  setSelectedSchool: (selectedSchool) =>
    set((state) => ({
      formData: { ...state.formData, selectedSchool }
    })),

  setCurrentStep: (step) => set({ currentStep: step }),

  reset: () => set({ formData: { ...initialFormData }, currentStep: 1 }),

  getRegisterData: () => {
    const { formData } = get();
    if (!formData.relationship || !formData.email || !formData.password) {
      return null;
    }
    return {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      relationship: formData.relationship,
    };
  },
}));
