// Test WhatsApp webhook
const testWhatsApp = async () => {
  const response = await fetch('http://localhost:3000/api/realtime/whatsapp/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'fitness ROLLING_STOCK TS-01 PASS All systems good',
      from: '+1234567890',
      timestamp: '2025-12-26T10:30:00Z'
    })
  });
  
  const result = await response.json();
  console.log('WhatsApp webhook test result:', result);
};

testWhatsApp();
