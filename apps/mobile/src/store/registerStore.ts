import { create } from 'zustand';

export type RelationshipType = 'father' | 'mother' | 'guardian' | 'other';

interface RegisterFormData {
  relationship: RelationshipType | null;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
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
