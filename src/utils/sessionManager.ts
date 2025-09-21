// Session manager for handling anonymous users securely
// Generates and stores temporary user sessions in localStorage

const SESSION_KEY = 'travel_app_session_id';

export class SessionManager {
  private sessionId: string | null = null;

  constructor() {
    this.initializeSession();
  }

  private initializeSession() {
    // Try to get existing session from localStorage
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      this.sessionId = stored;
    } else {
      // Generate new session ID (UUID format)
      this.sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, this.sessionId);
    }
  }

  getSessionId(): string {
    if (!this.sessionId) {
      this.initializeSession();
    }
    return this.sessionId!;
  }

  // Clear session (for logout or reset)
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    this.sessionId = null;
    this.initializeSession();
  }

  // Check if user is authenticated (has auth.uid())
  // For now, we'll treat all users as anonymous with session IDs
  async getCurrentUserId(): Promise<string> {
    // In the future, this could check for actual authentication
    // For now, return the session ID as the user ID
    return this.getSessionId();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();