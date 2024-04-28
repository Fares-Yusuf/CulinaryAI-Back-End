# Made By Fares Yusuf

# CulinaryAI Backend

Welcome to the CulinaryAI Backend! This backend server provides endpoints for managing user authentication, creating meal plans, and retrieving meal plan information from the database. It also communicates with external APIs to generate meal plans based on user preferences.

## Getting Started

To get started with the backend, follow these steps:

1. Clone the repository:

    ```bash
    git clone <repository-url>
    ```

2. Install dependencies:

    ```bash
    cd CulinaryAI-backend
    npm install
    ```

3. Set up environment variables:

    Create a `.env` file in the root directory and define the following variables:

    ```env
    PORT=3000
    DB_USER=<your-database-username>
    DB_PASSWORD=<your-database-password>
    DB_NAME=<your-database-name>
    DB_URL=<your-database-url>
    DB_PARAMS=<your-database-connection-parameters>
    RAPIDAPI_KEY=<your-rapidapi-key>
    ```

4. Start the server:

    ```bash
    npm start
    ```

## Endpoints

### Authentication

-   `POST /create-user`: Creates a new user account.

    -   Request Body:
        ```json
        {
            "name": "User Name",
            "email": "user@example.com",
            "password": "userpassword"
        }
        ```
    -   Response:
        ```json
        {
            "userId": "<user-id>",
            "name": "User Name",
            "email": "user@example.com"
        }
        ```

-   `POST /auth-user`: Authenticates a user.

    -   Request Body:
        ```json
        {
            "email": "user@example.com",
            "password": "userpassword"
        }
        ```
    -   Response:
        ```json
        {
            "success": "Logged in",
            "name": "User Name",
            "userId": "<user-id>",
            "email": "user@example.com"
        }
        ```

-   `PUT /update-user`: Updates user information (name, email, or password).
    -   Request Body:
        ```json
        {
            "userId": "<user-id>",
            "change": "password",
            "oldPassword": "oldpassword",
            "newPassword": "newpassword"
        }
        ```
        or
        ```json
        {
            "userId": "<user-id>",
            "change": "name",
            "newName": "New Name"
        }
        ```
        or
        ```json
        {
            "userId": "<user-id>",
            "change": "email",
            "oldPassword": "userpassword",
            "newEmail": "newemail@example.com"
        }
        ```
    -   Response:
        ```json
        {
            "success": "Password updated"
        }
        ```
        or
        ```json
        {
            "success": "Name updated"
        }
        ```
        or
        ```json
        {
            "success": "Email updated"
        }
        ```

### Meal Planner

-   `POST /api/meal-planner`: Generates a meal plan based on user preferences.

    -   Request Body:
        ```json
        {
            "userId": "<user-id>",
            "sections": ["breakfast", "lunch", "dinner"],
            "diet": "<diet-type>",
            "health": "<health-label>",
            "ENERC_KCAL": "<calories-per-day>"
        }
        ```
    -   Response:
        ```json
        {
            "success": "Meal Plan Created Successfully!"
        }
        ```

-   `GET /get-meal-plan`: Retrieves the meal plan for a user.
    -   Query Parameters:
        -   `userId`: The ID of the user.
    -   Response:
        ```json
        {
          "size": 7,
          "plan": {
            "accept": {
              "all": [
                {
                  "health": "<health-label>"
                },
                {
                  "diet": "<diet-type>"
                }
              ]
            },
            "fit": {
              "ENERC_KCAL": "<calories-per-day>"
            },
            "sections": {
              "Day 1": {
                "Breakfast": {
                  "img": "<image-url>",
                  "name": "<meal-name>",
                  "calories": "<calories>",
                  "carbs": "<carbs>",
                  "protein": "<protein>",
                  "fat": "<fat>",
                  "process": ["ingredients and steps for preparing the meal"]
                },
                "Lunch": {
                  "img": "<image-url>",
                  "name": "<meal-name>",
                  "calories": "<calories>",
                  "carbs": "<carbs>",
                  "protein": "<protein>",
                  "fat": "<fat>",
                  "process": ["ingredients and steps for preparing the meal"]
                },
                "Dinner": {
                  "img": "<image-url>",
                  "name": "<meal-name>",
                  "calories": "<calories>",
                  "carbs": "<carbs>",
                  "protein": "<protein>",
                  "fat": "<fat>",
                  "process": ["ingredients and steps for preparing the meal"]
                }
              }, "etc..."
            }
          }
        }
        ```

### Chat

-   `POST /api/chat`: Sends user input to the ChatGPT API and receives a response.
    -   Request Body:
        ```json
        {
            "text": "<user-input>"
        }
        ```
    -   Response:
        ```json
        {
            "content": "<response-text>",
            "role": "system"
        }
        ```

## Technologies Used

-   **Express.js**: Backend framework for handling HTTP requests.
-   **MongoDB**: NoSQL database for storing user information and meal plans.
-   **Axios**: HTTP client for making requests to external APIs.
-   **bcrypt**: Library for hashing passwords securely.
-   **Edamam API**: External API for generating meal plans based on user preferences.
-   **RapidAPI**: External API for integrating ChatGPT.
