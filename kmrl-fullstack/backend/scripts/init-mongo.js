// MongoDB initialization script
// This script runs when MongoDB container starts for the first time

db = db.getSiblingDB('kmrl');

// Create collections if they don't exist
db.createCollection('admins');
db.createCollection('trainsets');
db.createCollection('decisions');
db.createCollection('auditlogs');
db.createCollection('ingestionruns');
db.createCollection('scoredinductions');

// Create indexes for better performance
db.trainsets.createIndex({ trainsetId: 1 }, { unique: true });
db.trainsets.createIndex({ status: 1 });
db.trainsets.createIndex({ availability: 1 });

db.decisions.createIndex({ createdAt: -1 });
db.decisions.createIndex({ status: 1 });

db.auditlogs.createIndex({ timestamp: -1 });
db.auditlogs.createIndex({ userId: 1 });
db.auditlogs.createIndex({ action: 1 });

db.ingestionruns.createIndex({ createdAt: -1 });
db.ingestionruns.createIndex({ status: 1 });

db.scoredinductions.createIndex({ createdAt: -1 });
db.scoredinductions.createIndex({ trainsetId: 1 });

print('KMRL database initialized successfully');

