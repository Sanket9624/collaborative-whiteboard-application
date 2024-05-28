const express = require('express')
const userController = require('../controllers/user.controller')
const checkAuthMiddleware = require('../middleware/check-auth')
const router = express.Router()


//Create a user
router.post("/signUp",userController.createUser);

//Login user
router.post("/login",userController.login);

// Get user by ID
router.get('/:id',checkAuthMiddleware.checkAuth,userController.getUserById);
            
// Update user details
router.put('/:id', checkAuthMiddleware.checkAuth ,userController.updateUser);

// Delete user
router.delete('/:id', checkAuthMiddleware.checkAuth ,userController.deleteUser);


module.exports = router;