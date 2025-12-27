// Test manual input
const testManualInput = async () => {
  // Test manual mileage update
  const mileageResponse = await fetch('http://localhost:3000/api/realtime/manual/mileage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      trainsetId: 'TS-02',
      currentMileage: 48000,
      updatedBy: 'SUPERVISOR-001'
    })
  });
  
  const mileageResult = await mileageResponse.json();
  console.log('Manual mileage update result:', mileageResult);
  
  // Test manual cleaning update
  const cleaningResponse = await fetch('http://localhost:3000/api/realtime/manual/cleaning', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      trainsetId: 'TS-02',
      cleaningType: 'DEEP',
      status: 'COMPLETED',
      bayId: 'BAY-01',
      updatedBy: 'CLEANER-001'
    })
  });
  
  const cleaningResult = await cleaningResponse.json();
  console.log('Manual cleaning update result:', cleaningResult);
};

testManualInput();
