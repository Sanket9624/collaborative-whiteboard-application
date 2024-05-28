const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs');
const db = require('../database.js')
const dotenv = require('dotenv').config()
const Validator = require('fastest-validator');

// Controller to create a new user
const createUser = async (req, res) => {
            salt = await bcryptjs.genSalt(10);
            const hashedPassword = await bcryptjs.hash(req.body.password, salt);
            const { firstName, lastName, userName, email, password } = req.body
            const user = {
                        firstName,
                        lastName,
                        userName,
                        email,
                        password: hashedPassword,
            }
            if (!firstName || !lastName || !userName || !email || !password) {
                        return res.status(400).json({ error: 'All fields are required' });
            }

            // Check if username or email already exists
            const checkQuery = 'SELECT COUNT(*) AS count FROM users WHERE userName = ? OR email = ?';
            db.query(checkQuery, [userName, email], (checkError, checkResults) => {
                        if (checkError) {
                                    console.error('Error checking existing user:', checkError);
                                    return res.status(500).json({ error: 'Failed to create user' });
                        }
                        if (checkResults[0].count > 0) {
                                    return res.status(400).json({ error: 'Username or email already exists' });
                        }

                        const schema = {
                                    firstName: { type: "string", optional: false, max: 100 },
                                    lastName: { type: "string", optional: false, max: 100 },
                                    userName: { type: "string", optional: false },
                                    email: { type: "email", optional: false },
                                    password: { type: "string", optional: false },
                        };
                        const v = new Validator();
                        const validationResponse = v.validate(user, schema);

                        if (validationResponse !== true) {
                                    return res.status(400).json({
                                                message: "Validation failed",
                                                errors: validationResponse
                                    });
                        }

                        bcryptjs.hash(password, 10, (hashError, hashedPassword) => {
                                    if (hashError) {
                                                console.error('Error hashing password:', hashError);
                                                return res.status(500).json({ error: 'Failed to create user' });
                                    }

                                    // If username and email are unique, proceed with user creation
                                    const insertQuery = 'INSERT INTO users (firstName, lastName, userName, email, password) VALUES (?, ?, ?, ?, ?)';
                                    db.query(insertQuery, [firstName, lastName, userName, email, hashedPassword], (insertError, results) => {
                                                if (insertError) {
                                                            console.error('Error creating user:', insertError);
                                                            return res.status(500).json({ error: 'Failed to create user' });
                                                }

                                                // Generate JWT token
                                                const token = jwt.sign({ userId: results.insertId }, process.env.JWT_KEY ,{expiresIn : '1h'});

                                                // Send back token and user ID
                                                res.status(201).json({ message: 'User created successfully', userId: results.insertId, token });
                                    });
                        });
            });
}
const login = async (req, res) => {
            const { userName, password } = req.body;

            try {
                        // Check if both email and password are provided
                        if (!userName || !password) {
                                    return res.status(400).json({ error: "userName and password are required" });
                        }

                        // Retrieve user from the database by email
                        const query = 'SELECT * FROM users WHERE userName = ?';
                        db.query(query, [userName], async (err, results) => {
                                    if (err) {
                                                console.error("Server error about query", err);
                                                return res.status(500).json({ error: "Server Error" });
                                    }

                                    if (!results.length) {
                                                // Handle case where no user is found
                                                return res.status(401).json({ error: "Invalid userName or password" });
                                    }

                                    const user = results[0];

                                    // Compare the password with the hashed password in the database.
                                    const passwordMatch = await bcryptjs.compare(password, user.password);

                                    if (!passwordMatch) {
                                                return res.status(401).json({ error: "Invalid email or password" });
                                    } else {
                                                // Generate a new JWT token
                                                const newToken = jwt.sign({ id: user.id }, process.env.JWT_KEY, (err, token) => {
                                                            if (err) {
                                                                        console.error("Error signing JWT token:", err);
                                                                        return res.json({ err });
                                                            }


                                                            res.header('Authorization', token).status(200).json({ message: "Login successful", userName: user.userName, token: token });

                                                });
                                    }
                        });
            } catch (error) {
                        console.error("Error parsing request body:", error);
                        return res.status(400).json({ error: "Invalid request body" });
            }
};
// UpdateUser
const updateUser = async (req, res) => {
            const userId = req.params.id;
            const { firstName, lastName, email, userName } = req.body;

            try {
                        // Check if userId and at least one field to update is provided
                        if (!userId || (!firstName && !lastName && !email && !userName)) {
                                    return res.status(400).json({ error: "User ID and at least one field to update are required" });
                        }

                        let updateQuery = 'UPDATE users SET';
                        const updateValues = [];

                        if (firstName) {
                                    updateQuery += ' firstName = ?,';
                                    updateValues.push(firstName);
                        }

                        if (lastName) {
                                    updateQuery += ' lastName = ?,';
                                    updateValues.push(lastName);
                        }

                        if (email) {
                                    updateQuery += ' email = ?,';
                                    updateValues.push(email);
                        }

                        if (userName) {
                                    updateQuery += 'userName = ?,';
                                    updateValues.push(userName);
                        }

                        // Remove the trailing comma
                        updateQuery = updateQuery.slice(0, -1);

                        // Add WHERE clause to specify user to update
                        updateQuery += ' WHERE id = ?';
                        updateValues.push(userId);

                        db.query(updateQuery, updateValues, (err, result) => {
                                    if (err) {
                                                console.error("Error updating user:", err);
                                                return res.status(500).json({ error: "Failed to update user" });
                                    }

                                    if (result.affectedRows === 0) {
                                                return res.status(404).json({ error: "User not found" });
                                    }

                                    return res.status(200).json({ message: "User updated successfully" });
                        });
            } catch (error) {
                        console.error("Error updating user:", error);
                        return res.status(500).json({ error: "Failed to update user" });
            }
};
// Get User By ID
const getUserById = async (req, res) => {
            const userId = req.params.id;
            try {
                        // Check if userId is provided
                        if (!userId) {
                                    return res.status(400).json({ error: "User ID is required" });
                        }

                        // Extract the token from the request headers
                        const token = req.headers.authorization;

                        // Verify the token
                        jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
                                    if (err) {
                                                return res.status(401).json({ error: 'Unauthorized: Invalid token' + err });
                                    } else {
                                                // Query to retrieve user by userId
                                                const query = 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL';

                                                // Execute the query with the userId parameter
                                                db.query(query, [userId], (err, results) => {
                                                            if (err) {
                                                                        console.error("Error fetching user:", err);
                                                                        return res.status(500).json({ error: "Failed to fetch user" });
                                                            }

                                                            // Check if user with provided userId exists
                                                            if (results.length === 0) {
                                                                        return res.status(404).json({ error: "User not found" });
                                                            }

                                                            // Return the user details
                                                            const user = results[0];
                                                            return res.status(200).json({ user });
                                                });
                                    }
                        });
            } catch (error) {
                        console.error("Error fetching user:", error);
                        return res.status(500).json({ error: "Failed to fetch user" });
            }
};
// Delete User By ID
const deleteUser = async (req, res) => {
            try {
                const userId = req.params.id;
        
                // Query to check if the user has already been soft-deleted
                const checkQuery = 'SELECT deleted_at FROM users WHERE id = ?';
                db.query(checkQuery, [userId], (err, results) => {
                    if (err) {
                        console.error("Error checking user deletion status:", err);
                        return res.status(500).json({ error: "Failed to check user deletion status" });
                    }
        
                    // If the user has already been soft-deleted (deleted_at is not null)
                    if (results.length > 0 && results[0].deleted_at !== null) {
                        return res.status(400).json({ error: "User has already been soft-deleted" });
                    }
        
                    // Proceed with soft-deleting the user
                    const deleteQuery = 'UPDATE users SET deleted_at = CURRENT_TIMESTAMP() WHERE id = ?';
                    db.query(deleteQuery, [userId], (err, results) => {
                        if (err) {
                            console.error("Error soft-deleting user:", err);
                            return res.status(500).json({ error: "Failed to soft-delete user" });
                        }
        
                        if (results.affectedRows === 0) {
                            return res.status(404).json({ error: "User not found" });
                        }
        
                        res.json({ status: "User soft-deleted successfully" });
                    });
                });
            } catch (error) {
                console.error("Error in deleteUser:", error);
                return res.status(500).json({ error });
            }
        };
module.exports = {
            createUser,
            login,
            updateUser,
            getUserById,
            deleteUser,
};