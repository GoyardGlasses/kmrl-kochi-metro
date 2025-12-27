import { httpClient } from "./httpClient";

export interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'fitness' | 'mileage' | 'cleaning' | 'branding';
}

export interface WhatsAppWebhook {
  message: string;
  from: string;
  timestamp: string;
}

export class WhatsAppService {
  async sendMessage({ to, message, type = 'text' }: WhatsAppMessage) {
    return httpClient.post('/realtime/whatsapp/send', { to, message, type });
  }

  async sendFitnessUpdate(trainsetId: string, department: string, status: string) {
    const message = `Fitness update: ${department} ${trainsetId} ${status}`;
    return this.sendMessage({ to: 'supervisor', message, type: 'fitness' });
  }

  async sendMileageUpdate(trainsetId: string, mileage: number) {
    const message = `Mileage update: ${trainsetId} ${mileage}`;
    return this.sendMessage({ to: 'supervisor', message, type: 'mileage' });
  }

  async sendCleaningUpdate(trainsetId: string, status: string, bayId?: string) {
    const message = `Cleaning update: ${trainsetId} ${status}${bayId ? ` ${bayId}` : ''}`;
    return this.sendMessage({ to: 'supervisor', message, type: 'cleaning' });
  }

  async sendBrandingUpdate(trainsetId: string, hours: number) {
    const message = `Branding update: ${trainsetId} ${hours} hours`;
    return this.sendMessage({ to: 'supervisor', message, type: 'branding' });
  }

  parseWhatsAppMessage(message: string) {
    const patterns = {
      fitness: /fitness\s+(\w+)\s+(TS-\d+)\s+(PASS|WARN|FAIL)\s*(.+)?/i,
      mileage: /mileage\s+(TS-\d+)\s+(\d+)/i,
      cleaning: /cleaning\s+(TS-\d+)\s+(COMPLETED|PENDING|OVERDUE)\s*(.+)?/i,
      branding: /branding\s+(TS-\d+)\s+(\d+)\s*hours?/i
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern);
      if (match) {
        return {
          type,
          data: match.slice(1)
        };
      }
    }
    
    return null;
  }
}

export const whatsAppService = new WhatsAppService();
