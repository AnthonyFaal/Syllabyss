const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authenticate = require('../middlewares/authenticate');

// Public routes
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourse);

// Protected routes (require authentication)
router.use(authenticate); 

router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);
//router.delete('/:id', courseController.deleteCourse);
router.delete('/del', courseController.deleteAllCourses);
router.get('/user/:userId?', courseController.getCoursesByUser);

module.exports = router;