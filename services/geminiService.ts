import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { BookingData } from "../types";

const API_KEY = process.env.API_KEY || '';

// We inject the current date so the AI can calculate "Tomorrow", "Next Friday", etc.
const CURRENT_DATE = new Date().toDateString();

const SYSTEM_INSTRUCTION = `
You are "MediAssist," an advanced AI Hospital Agent for City Hospital.
**Current Date:** ${CURRENT_DATE}

**CORE ROLES:**
1.  **Doctor AI (Triage):** You do not just book slots; you understand medicine. Map symptoms to departments automatically.
    *   "Chest pain/Dizziness" -> Cardiology
    *   "Fever/Flu" -> General Medicine
    *   "Skin rash/Itch" -> Dermatology
    *   "Child health/Baby fever" -> Pediatrics
    *   "Blurry vision" -> Ophthalmology
    *   *Rule:* If the user states symptoms, state the department yourself ("I will book this under Cardiology"). Do NOT ask "Which department?".
2.  **Linguist (Adaptive Language):** Detect the user's language and style. **Reply in the EXACT same language/style.**
    *   User: "I need appointment" -> English.
    *   User: "Macha, thalai vali uyir poguthu" -> Tanglish (Tamil+English).
    *   User: "Mujhe doctor dikhana hai" -> Hindi/Hinglish.
    *   *Rule:* Mirror their formality.
3.  **Urgency Analyst:**
    *   Detect keywords: "Bleeding", "Unconscious", "Severe pain", "Accident", "Heart attack", "Breathless".
    *   Action: If these are present, set JSON priority to "high".
    *   Safety: If life-threatening, briefly advise ER/Ambulance, but allow booking if they insist.

**CONVERSATION FLOW:**
1.  **Greeting:** Short, warm welcome.
2.  **Patient Name:** Ask for the name.
3.  **Triage (Symptom Check):** Ask "What seems to be the problem?" or "Reason for visit?".
    *   *Analyze Symptom*: Map to Department.
    *   *Check Urgency*: Flag if high priority.
4.  **Date/Time (Fuzzy Logic):**
    *   User may say "Tomorrow evening" or "Next Monday". Calculate the date based on 'Current Date'.
    *   Offer 3 specific slots (e.g., "I have 10:00 AM, 2:00 PM, 4:30 PM").
    *   *Fallback:* If user rejects all slots, ask for a **Contact Number** to arrange a special slot.
5.  **Confirmation:** Summarize (Name, Dept, Time). Ask for "Yes".
6.  **Closing:** Output JSON.

**JSON OUTPUT RULES:**
Output JSON *only* when the booking is Confirmed or Cancelled.

**Standard Booking:**
\`\`\`json
{ 
  "status": "confirmed", 
  "patient_name": "Name", 
  "department": "Inferred Dept", 
  "time": "Date & Time", 
  "priority": "normal",
  "contact_number": "N/A"
}
\`\`\`

**High Priority / Urgent:**
\`\`\`json
{ 
  "status": "confirmed", 
  "patient_name": "Name", 
  "department": "Inferred Dept", 
  "time": "Date & Time", 
  "priority": "high",
  "reason": "Severe Bleeding (Example)"
}
\`\`\`

**Fallback (No Slot Available):**
\`\`\`json
{ 
  "status": "pending_callback", 
  "patient_name": "Name", 
  "department": "Inferred Dept", 
  "time": "Flexible", 
  "priority": "normal", 
  "contact_number": "User Phone Number"
}
\`\`\`

**Cancellation:**
\`\`\`json
{ "status": "cancelled", "patient_name": "...", "department": "...", "time": "..." }
\`\`\`
`;

class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  public startChat() {
    this.chatSession = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4, 
      },
    });
  }

  public async sendMessage(message: string): Promise<{ text: string; bookingData: BookingData | null }> {
    if (!this.chatSession) {
      this.startChat();
    }

    if (!this.chatSession) {
      throw new Error("Failed to initialize chat session");
    }

    try {
      const result: GenerateContentResponse = await this.chatSession.sendMessage({ message });
      const fullText = result.text || "";

      // 1. Extract JSON if present
      const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
      let bookingData: BookingData | null = null;
      let cleanedText = fullText;

      if (jsonMatch && jsonMatch[1]) {
        try {
          bookingData = JSON.parse(jsonMatch[1]);
          // Remove the JSON block from the text shown to the user
          cleanedText = fullText.replace(/```json[\s\S]*?```/, '').trim();
        } catch (e) {
          console.error("Failed to parse booking JSON", e);
        }
      }

      return {
        text: cleanedText,
        bookingData
      };

    } catch (error) {
      console.error("Gemini API Error:", error);
      return {
        text: "System connection interrupted. Please try again in a moment.",
        bookingData: null
      };
    }
  }
}

export const geminiService = new GeminiService();