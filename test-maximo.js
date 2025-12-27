// Test Maximo integration
const testMaximo = async () => {
  const response = await fetch('http://localhost:3000/api/realtime/maximo/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobCards: [
        {
          trainsetId: 'TS-01',
          workOrderId: 'WO-2025-001',
          status: 'OPEN',
          description: 'Replace worn brake pads on Bogie A1',
          priority: 'HIGH',
          workType: 'CORRECTIVE',
          location: 'Bogie-A1',
          technician: 'TECH-001',
          estimatedHours: 4,
          reportedDate: '2025-12-20T08:00:00Z',
          targetCompletion: '2025-12-27T18:00:00Z'
        }
      ]
    })
  });
  
  const result = await response.json();
  console.log('Maximo import test result:', result);
};

testMaximo();
