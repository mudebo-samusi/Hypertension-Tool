# Hypertension Tool

This repository contains a tool for monitoring and managing hypertension. The tool includes a backend built with Flask and a frontend built with React.

## Features

* User registration and login
* Blood pressure monitoring
* Historical readings and trends
* Real-time data updates via MQTT
* Profile management
* Password reset functionality

## Getting Started

### Prerequisites

* Python 3.8 or higher
* Node.js and npm
* Flask
* React

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Denzam-hub/Hypertension-Tool.git
   cd Hypertension-Tool
   ```

2. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   flask run
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

### Usage

* Access the application at `http://localhost:3000`
* Register a new user or log in with existing credentials
* Monitor blood pressure readings and view historical data
* Update profile information and request password resets if needed

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature-branch`)
6. Open a pull request

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Acknowledgments

* Flask
* React
* Socket.IO
* Chart.js

## Counters

* Commit counter: !GitHub commit activity
* Language counter: !GitHub language count
* Tool counter: !GitHub top language
* Visitor counter: !Visitor Count
