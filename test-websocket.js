// Test WebSocket connection
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Subscribe to trainset updates
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE_TRAINSET',
    trainsetId: 'TS-01'
  }));
  
  // Request real-time updates
  ws.send(JSON.stringify({
    type: 'GET_REAL_TIME_UPDATES',
    trainsetId: 'TS-01'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received WebSocket message:', message);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Keep connection alive for 10 seconds
setTimeout(() => {
  ws.close();
}, 10000);
