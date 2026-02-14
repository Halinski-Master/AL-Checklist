
import { InspectionData } from "../types";

const DRAFT_KEY = 'alos_tank_inspector_draft';
const HISTORY_KEY = 'alos_tank_inspector_history';

export const PersistenceService = {
  saveDraft: (data: InspectionData) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  },

  getDraft: (): InspectionData | null => {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft) : null;
  },

  clearDraft: () => {
    localStorage.removeItem(DRAFT_KEY);
  },

  saveToHistory: (data: InspectionData) => {
    const history = PersistenceService.getHistory();
    const newHistory = [data, ...history].slice(0, 20); // Keep last 20 inspections
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  },

  getHistory: (): InspectionData[] => {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  }
};
