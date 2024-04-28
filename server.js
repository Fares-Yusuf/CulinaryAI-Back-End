// Import the express module
const express = require("express");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);

let dbPrefix = properties.get("db.prefix");
let dbUser = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.name");
let dbUrl = properties.get("db.url");
let dbParams = properties.get("db.params");
const uri = dbPrefix + dbUser + ":" + dbPwd + dbUrl + dbParams;
const { MongoClient, ObjectId } = require("mongodb");

const client = new MongoClient(uri);
const db = client.db(dbName);
client.connect();

// Create an instance of express
const app = express();

app.set("json spaces", 3);

// Enable CORS for all routes
app.use(cors({ origin: "*" }));

// Enable logging
app.use(morgan("short"));

// Enable parsing of JSON bodies in requests
app.use(express.json());

const axios = require("axios");

const bcrypt = require("bcrypt");

app.post("/api/chat", async (req, res) => {
    const userInput = req.body.text;

    const GPT = {
        method: "POST",
        url: "https://chatgpt-api8.p.rapidapi.com/",
        headers: {
            "content-type": "application/json",
            "X-RapidAPI-Key":
                "2d265caf41msh89b69ff4769bdaep1b34f0jsnbad243c2d97c",
            "X-RapidAPI-Host": "chatgpt-api8.p.rapidapi.com",
        },
        data: [
            {
                content:
                    "Hello! I'm an AI assistant bot based on ChatGPT 3. How may I help you?",
                role: "system",
            },
            {
                content: userInput,
                role: "user",
            },
        ],
    };

    try {
        const response = await axios.request(GPT);
        // waiting for response from GPT log
        console.log("waiting for response from GPT");
        console.log(response.data);
        // respond to the user
        res.send(response.data);
    } catch (error) {
        res.send({
            text: "You have exceeded the DAILY quota for Requests on your current plan, BASIC. Upgrade your plan at https://rapidapi.com/haxednet/api/chatgpt-api8",
        });
    }
});

app.post("/api/meal-planner", async (req, res) => {
    const userInput = req.body;
    // Initialize an empty meal plan object
    const mealPlan = {
        size: 7,
        plan: {
            accept: {
                all: [{ health: userInput.health }, { diet: userInput.diet }],
            },
            fit: { ENERC_KCAL: userInput.ENERC_KCAL },
            sections: {}, // Initialize an empty sections object
        },
    };

    // Dynamically add meal sections based on user input
    if (userInput.sections.includes("breakfast")) {
        mealPlan.plan.sections.Breakfast = {
            accept: {
                all: [
                    {
                        dish: [
                            "drinks",
                            "egg",
                            "biscuits and cookies",
                            "bread",
                            "pancake",
                            "cereals",
                        ],
                    },
                    {
                        meal: ["breakfast"],
                    },
                ],
            },
            fit: {},
        };
    }

    if (userInput.sections.includes("lunch")) {
        mealPlan.plan.sections.Lunch = {
            accept: {
                all: [
                    {
                        dish: ["main course"],
                    },
                    {
                        meal: ["lunch/dinner"],
                    },
                ],
            },
            fit: {},
        };
    }

    if (userInput.sections.includes("dinner")) {
        mealPlan.plan.sections.Dinner = {
            accept: {
                all: [
                    {
                        dish: ["main course"],
                    },
                    {
                        meal: ["lunch/dinner"],
                    },
                ],
            },
            fit: {},
        };
    }
    // Making the API request to Edamam's API
    try {
        const response = await axios.post(
            "https://api.edamam.com/api/meal-planner/v1/f0064310/select",
            mealPlan, // Use the dynamically created meal plan
            {
                headers: {
                    accept: "application/json",
                    "Edamam-Account-User": "f0064310",
                    Authorization:
                        "Basic ZjAwNjQzMTA6YTYzMWQ2YjA5YzE1YjFlMWVjZDcwYmJkNzY4ZDRiYjY=",
                    "Content-Type": "application/json",
                },
            }
        );
        extractRecipeLinks(response.data).then((result) => {
            saveMealPlanToDatabase(userInput.userId, result);
            res.status(200).json({
                success: "Meal Plan Created Successfully!",
            });
        });
    } catch (error) {
        console.error("Error making request:", error);
        res.status(500).send("Error processing meal planner request");
    }
});

// Function to delete existing meal plan for a user and then save the new meal plan to the database
async function saveMealPlanToDatabase(userId, data) {
    try {
        // Access the "mealplans" collection in MongoDB
        const mealPlansCollection = db.collection("mealplans");

        // Delete existing meal plan for the user
        await mealPlansCollection.deleteMany({ userId: userId });

        // Include the userId in the meal plan data
        const mealPlanDataWithUserId = {
            ...cleanUpMealPlanData(data),
            userId: userId,
        };

        // Save the new meal plan data to the collection
        await mealPlansCollection.insertOne(mealPlanDataWithUserId);

        console.log("Meal plan saved successfully!");
    } catch (error) {
        console.error("Error saving meal plan:", error);
    }
}

async function extractRecipeLinks(recipeData) {
    const structuredData = {};
    // console.log("recipeData", recipeData);
    console.log(JSON.stringify(recipeData, null, 3));

    // Iterate through each item in recipeData.selection
    for (const [index, item] of Object.entries(recipeData.selection)) {
        // Generate the day key (e.g., Day1, Day2, etc.)
        const dayKey = `Day ${parseInt(index) + 1}`;

        // Initialize an object to store the sections for this day
        const daySections = {};

        // Loop through each meal type (Breakfast, Lunch, Dinner)
        for (const mealType in item.sections) {
            if (item.sections.hasOwnProperty(mealType)) {
                // Check if the meal type is present in the current item
                if (item.sections[mealType]) {
                    // Add the meal type and its assigned URL to the daySections object
                    // Only take what is after the underscore (_) in the URL
                    daySections[mealType] = await recipeSearch(
                        item.sections[mealType].assigned.split("_")[1]
                    );
                }
            }
        }

        // Add the day and its sections to the structuredData object
        structuredData[dayKey] = daySections;
    }

    // Return the structured data
    return structuredData;
}

async function recipeSearch(recipeID) {
    const baseURL = `https://api.edamam.com/api/recipes/v2/${recipeID}?type=public&app_id=f0064310&app_key=a631d6b09c15b1e1ecd70bbd768d4bb6&field=ingredientLines&field=label&field=image&field=yield&field=totalNutrients`;
    const response = await fetch(baseURL, {
        headers: {
            accept: "application/json",
            "Edamam-Account-User": "f0064310",
            "Accept-Language": "en",
        },
    });
    const mealResponse = await response.json();
    const filteredData = {
        label: mealResponse.recipe.label,
        image: mealResponse.recipe.image,
        yield: mealResponse.recipe.yield,
        ingredientLines: mealResponse.recipe.ingredientLines,
        ENERC_KCAL: mealResponse.recipe.totalNutrients.ENERC_KCAL,
        FAT: mealResponse.recipe.totalNutrients.FAT,
        CHOCDF: mealResponse.recipe.totalNutrients.CHOCDF,
        PROCNT: mealResponse.recipe.totalNutrients.PROCNT,
    };
    return filteredData;
}

// Hashing a password
async function hashPassword(password) {
    const saltRounds = 10; // Number of salt rounds (cost factor)
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

// Verifying a password
async function verifyPassword(password, hashedPassword) {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
}

// Creating a new user via POST request
app.post("/create-user", async (req, res) => {
    // Extracting user data from the request body
    const userData = req.body;
    try {
        // Ensuring the database connection is established
        if (!db) {
            await connectToDatabase();
        }
        // Accessing the "users" collection in MongoDB
        const usersCollection = db.collection("users");

        // check if the user already exists
        const user = await usersCollection.findOne({ email: userData.email });

        if (user) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Creating the user document to be inserted
        const newUser = {
            name: userData.name,
            email: userData.email,
        };

        // Hashing the user's password
        hashPassword(userData.password)
            .then((hashedPass) => {
                // append password: hashedPass to newUser
                newUser.password = hashedPass;
            })
            .then(() => {
                // Inserting the user into the database
                usersCollection.insertOne(newUser).then((result) => {
                    // Responding with the newly created user's ID
                    res.status(201).json({
                        userId: result.insertedId,
                        name: userData.name,
                        email: userData.email,
                    });
                });
            });
    } catch (error) {
        // Handling errors gracefully
        console.error("Error creating user:", error);

        // Returning an appropriate error response
        res.status(500).json({
            error: "An error occurred while creating the user",
        });
    }
});

// Authenticating a user via POST request
app.post("/auth-user", async (req, res) => {
    // Extracting user data from the request body
    const userData = req.body;
    try {
        // Ensuring the database connection is established
        if (!db) {
            await connectToDatabase();
        }
        // Accessing the "users" collection in MongoDB
        const usersCollection = db.collection("users");

        // Finding the user with the provided email
        const user = await usersCollection.findOne({ email: userData.email });

        // If the user doesn't exist, return an error
        if (!user) {
            return res.status(401).json({ failed: "Invalid email" });
        }

        // Verifying the user's password using verifyPassword function
        const isPasswordValid = await verifyPassword(
            userData.password,
            user.password
        );

        // If the password is invalid, return an error
        if (!isPasswordValid) {
            return res.status(401).json({ failed: "Invalid password" });
        } else {
            return res.status(200).json({
                success: "Logged in",
                name: user.name,
                userId: user._id,
                email: user.email,
            });
        }
    } catch (error) {
        // Handling errors gracefully
        console.error("Error authenticating user:", error);

        // Returning an appropriate error response
        res.status(500).json({
            error: "An error occurred while authenticating the user",
        });
    }
});

// update user info endpoint
app.put("/update-user", async (req, res) => {
    // Extracting user data from the request body
    const userData = req.body;
    console.log(userData);
    try {
        // Ensuring the database connection is established
        if (!db) {
            await connectToDatabase();
        }
        // Accessing the "users" collection in MongoDB
        const usersCollection = db.collection("users");

        // Finding the user with the provided email
        const user = await usersCollection.findOne({
            _id: new ObjectId(userData.userId),
        });

        // check what the user wants to update (name or email or password) they will send a change object
        if (userData.change === "password") {
            // Verifying the user's password using verifyPassword function
            const isPasswordValid = await verifyPassword(
                userData.oldPassword,
                user.password
            );

            // If the password is invalid, return an error
            if (!isPasswordValid) {
                return res.status(401).json({ failed: "Invalid password" });
            }

            // Hashing the user's new password
            hashPassword(userData.newPassword)
                .then((hashedPass) => {
                    // Update the user's password in the database
                    usersCollection.updateOne(
                        { _id: new ObjectId(userData.userId) },
                        { $set: { password: hashedPass } }
                    );
                })
                .then(() => {
                    // Respond with a success message
                    res.status(200).json({ success: "Password updated" });
                });
        }

        if (userData.change === "name") {
            // Update the user's name in the database
            usersCollection.updateOne(
                { _id: new ObjectId(userData.userId) },
                { $set: { name: userData.newName } }
            );
            // Respond with a success message
            res.status(200).json({ success: "Name updated" });
        }

        if (userData.change === "email") {
            // verify current password
            const isPasswordValid = await verifyPassword(
                userData.oldPassword,
                user.password
            );

            // If the password is invalid, return an error
            if (!isPasswordValid) {
                return res.status(401).json({ failed: "Invalid password" });
            }

            // Update the user's email in the database
            usersCollection.updateOne(
                { _id: new ObjectId(userData.userId) },
                { $set: { email: userData.newEmail } }
            );
            // Respond with a success message
            res.status(200).json({ success: "Email updated" });
        }
    } catch (error) {
        // Handling errors gracefully
        console.error("Error updating user:", error);

        // Returning an appropriate error response
        res.status(500).json({
            error: "An error occurred while updating the user",
        });
    }
});

// endpoint to get user's meal plan from the database
app.get("/get-meal-plan", async (req, res) => {
    // Extracting user ID from the request query
    const userId = req.query.userId;

    // example query: http://localhost:3000/get-meal-plan?userId=60f6b3b3b3b3b3b3b3b3b3b3

    try {
        // Ensuring the database connection is established
        if (!db) {
            await connectToDatabase();
        }
        // Accessing the "mealplans" collection in MongoDB
        const mealPlansCollection = db.collection("mealplans");

        // Finding the meal plan for the user
        const mealPlan = await mealPlansCollection.findOne({ userId: userId });

        // If the meal plan doesn't exist, return an error
        if (!mealPlan) {
            return res.status(404).json({ error: "Meal plan not found" });
        }

        // Responding with the user's meal plan
        res.status(200).json(mealPlan);
    } catch (error) {
        // Handling errors gracefully
        console.error("Error fetching meal plan:", error);

        // Returning an appropriate error response
        res.status(500).json({
            error: "An error occurred while fetching the meal plan",
        });
    }
});
function cleanUpMealPlanData(originalData) {
    const cleanedUpData = {};

    // Iterate through each day in the original data
    for (const day in originalData) {
        if (originalData.hasOwnProperty(day)) {
            const meals = originalData[day];

            // Initialize an object to store the cleaned-up meals for this day
            const cleanedUpMeals = {};

            // Iterate through each meal type for this day
            for (const mealType in meals) {
                if (meals.hasOwnProperty(mealType)) {
                    const meal = meals[mealType];

                    // Construct the cleaned-up meal object
                    const cleanedUpMeal = {
                        img: meal.image,
                        name: meal.label,
                        calories: `${Math.round(
                            meal.ENERC_KCAL.quantity / meal.yield
                        )}`,
                        carbs: `${Math.round(meal.CHOCDF.quantity)}${
                            meal.CHOCDF.unit
                        }`,
                        protein: `${Math.round(meal.PROCNT.quantity)}${
                            meal.PROCNT.unit
                        }`,
                        fat: `${Math.round(meal.FAT.quantity)}${meal.FAT.unit}`,
                        process: meal.ingredientLines, // Replace with actual process if available
                    };

                    // Add the cleaned-up meal to the meals object for this day
                    cleanedUpMeals[mealType] = cleanedUpMeal;
                }
            }

            // Add the cleaned-up meals to the cleaned-up data for this day
            cleanedUpData[day] = cleanedUpMeals;
        }
    }

    return cleanedUpData;
}

// root endpoint
app.get("/", (req, res) => {
    res.send("Welcome to CulinaryAI's Backend!");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
