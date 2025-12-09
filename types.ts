export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface BookingData {
  status: string;
  patient_name: string;
  department: string;
  time: string;
  priority?: 'high' | 'normal';
  contact_number?: string;
  timestamp?: string; // Client-side timestamp for history
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  bookingData: BookingData | null;
}