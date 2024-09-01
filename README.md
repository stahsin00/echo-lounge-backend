# Echo Lounge - Backend

## Overview
This repository contains the backend code for Echo Lounge, providing API endpoints for the game's functionality, including character generation, conversation management, and drink serving.

## Repositories
- [Frontend Repository](https://github.com/stahsin00/echo-lounge-frontend)

## Features
- Procedural generation of characters using AI APIs
- Dynamic conversations powered by ChatGPT
- Asset management and storage via AWS S3
- Session management and caching using Redis
- MongoDB for persistent data storage

## Tech Stack
- Node.js
- Express
- MongoDB + Mongoose
- Redis
- AWS S3

## Getting Started

### Prerequisites
- Node.js and npm installed
- MongoDB installed and running locally or access to a MongoDB cloud instance
- Redis installed locally or access to a Redis instance
- AWS account with an S3 bucket set up

### Installation
1. `git clone https://github.com/stahsin00/echo-lounge-backend.git`
2. `cd echo-lounge-backend`
3. `npm install`

### Configurations
Create a `.env` file based on `.env.example` and set the required environment variables

### Running the Application
`npm start`  
The server will run on `http://localhost:3000` by default.

## API Endpoints
- `/api/serve` : Handles drink serving
- `/api/converse` : Manages character dialogues
- `/api/new-customer` : Provides a new customer
