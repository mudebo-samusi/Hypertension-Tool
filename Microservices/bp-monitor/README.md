# Blood Pressure Monitor Microservice

A comprehensive microservice that provides real-time blood pressure monitoring, dummy data generation, and predictions. This service is designed to integrate seamlessly with the existing Hypertension Tool frontend monitor namespace.

## Features

### Core Functionality
- **Real-time BP Data Generation**: Generates realistic dummy blood pressure readings with various user profiles
- **Prediction Engine**: Provides BP predictions based on medical guidelines
- **WebSocket Support**: Real-time communication via Socket.IO
- **REST API**: Complete API for data access and control
- **Database Storage**: SQLite database for storing readings and predictions
- **User Profiles**: Multiple user profiles for realistic data simulation

### Data Patterns
- **Time-based Variations**: BP changes based on time of day
- **Activity Simulation**: Different activity levels affect readings
- **Stress Factors**: Simulated stress impact on BP
- **Medical Conditions**: Various health profiles (healthy, pre-hypertension, stages 1-2 hypertension)

## API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /api/monitoring/status` - Get monitoring status

### Data Management
- `POST /api/generate-reading` - Generate a single BP reading
- `GET /api/readings` - Get recent BP readings (supports pagination and user filtering)
- `GET /api/readings/<id>` - Get detailed reading with prediction

### Monitoring Control
- `POST /api/start-monitoring` - Start continuous monitoring
- `POST /api/stop-monitoring` - Stop continuous monitoring

## WebSocket Events

### Monitor Namespace (`/monitor`)
- `new_bp_reading` - Broadcasts new BP readings
- `prediction_result` - Broadcasts prediction results  
- `status` - Connection and service status updates
- `monitoring_started` - Monitoring activation confirmation
- `monitoring_stopped` - Monitoring deactivation confirmation

## Installation & Setup

### Local Development

1. **Clone and Navigate**
   ```bash
   cd Microservices/bp-monitor
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   Copy `.env.example` to `.env` and adjust settings as needed.

5. **Run the Service**
   ```bash
   python app.py
   ```

The service will start on `http://localhost:5001`

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t bp-monitor-service .
   ```

2. **Run Container**
   ```bash
   docker run -p 5001:5001 -v $(pwd)/data:/app/data bp-monitor-service
   ```

### Docker Compose Integration

Add to your existing `docker-compose.yaml`:

```yaml
services:
  bp-monitor:
    build: ./Microservices/bp-monitor
    ports:
      - "5001:5001"
    volumes:
      - ./data/bp-monitor:/app/data
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=sqlite:///data/bp_monitor.db
    networks:
      - hypertension-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Frontend Integration

### Update Frontend Socket Configuration

To connect your existing frontend to this microservice, update the socket service:

```javascript
// In frontend/src/services/socket.js
const potentialSocketURLs = [
    'http://localhost:5000',      // Main backend
    'http://localhost:5001',      // BP Monitor microservice
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5001',
];
```

### Component Integration

Your existing `BPMonitor.jsx` component should work without changes, as the microservice implements the same WebSocket interface as the main backend.

## Configuration

### User Profiles

The service includes predefined user profiles for realistic data:

- **User 1**: Healthy (35 years, normal BP)
- **User 2**: Pre-hypertension (45 years, elevated BP) 
- **User 3**: Stage 1 Hypertension (60 years)
- **User 4**: Stage 2 Hypertension (55 years)
- **User 5**: Athletic (25 years, low resting HR)

### Data Generation Parameters

- **Interval**: 5 seconds (configurable)
- **Variations**: ±10-25 mmHg based on factors
- **Heart Rate**: 50-150 BPM realistic range
- **Time Factors**: Morning/evening peaks
- **Activity Simulation**: Rest to high activity
- **Stress Simulation**: Calm to very stressed

## Data Models

### BP Reading
```json
{
  "id": "uuid",
  "user_id": 1,
  "systolic": 120,
  "diastolic": 80,
  "heart_rate": 75,
  "timestamp": "2025-09-23T10:30:00",
  "device_id": "BP_MONITOR_001"
}
```

### Prediction Result
```json
{
  "reading_id": "uuid",
  "prediction": "Normal Blood Pressure",
  "probability": 0.95,
  "risk_level": "Low",
  "recommendation": "Maintain healthy lifestyle...",
  "confidence": "High",
  "bp_category": "Normal",
  "timestamp": "2025-09-23T10:30:00"
}
```

## Database Schema

### BP Readings Table
- `id` (TEXT PRIMARY KEY) - Reading UUID
- `user_id` (INTEGER) - User identifier
- `systolic` (INTEGER) - Systolic pressure
- `diastolic` (INTEGER) - Diastolic pressure  
- `heart_rate` (INTEGER) - Heart rate
- `timestamp` (TEXT) - ISO timestamp
- `device_id` (TEXT) - Device identifier
- `created_at` (DATETIME) - Database timestamp

### Predictions Table
- `reading_id` (TEXT PRIMARY KEY) - Links to BP reading
- `prediction` (TEXT) - Prediction text
- `probability` (REAL) - Confidence probability
- `risk_level` (TEXT) - Risk assessment
- `recommendation` (TEXT) - Medical recommendation
- `confidence` (TEXT) - Confidence level
- `bp_category` (TEXT) - BP category
- `timestamp` (TEXT) - ISO timestamp
- `created_at` (DATETIME) - Database timestamp

## Monitoring & Logging

The service provides comprehensive logging for:
- Connection events
- Data generation
- Database operations
- Error handling
- Performance metrics

Log levels can be configured via environment variables.

## Security Considerations

- JWT token validation (compatible with main backend)
- CORS configuration for frontend integration
- Rate limiting considerations for production
- Database access control
- Input validation and sanitization

## Scalability

### Performance Features
- Efficient SQLite operations
- Connection pooling
- Memory-efficient data structures
- Configurable limits and thresholds

### Scaling Options
- Horizontal scaling with load balancer
- Database migration to PostgreSQL/MySQL
- Redis for caching and pub/sub
- Container orchestration ready

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure port 5001 is available
2. **Database Permissions**: Check write permissions for SQLite file
3. **CORS Errors**: Verify frontend URL in CORS_ORIGINS
4. **Socket Connection**: Check firewall and network settings

### Debug Mode

Enable debug logging:
```bash
export FLASK_ENV=development
python app.py
```

### Health Checks

Monitor service health:
```bash
curl http://localhost:5001/health
```

## Development

### Adding New Features

1. **New User Profiles**: Extend `user_profiles` in `BPDataGenerator`
2. **Prediction Rules**: Update `prediction_rules` in `BPPredictionEngine`
3. **API Endpoints**: Add routes with proper error handling
4. **WebSocket Events**: Extend namespace handlers

### Testing

Run comprehensive tests:
```bash
python -m pytest tests/
```

### Code Quality

- Follow PEP 8 style guidelines
- Use type hints for better code documentation
- Implement comprehensive error handling
- Add logging for debugging and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure code quality standards
5. Submit a pull request

## License

This microservice is part of the Hypertension Tool project and follows the same licensing terms.