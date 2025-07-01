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
router.patch('/:courseId/status', courseController.updateCourse);
//router.delete('/:id', courseController.deleteCourse);
router.delete('/del', courseController.deleteAllCourses);
router.get('/user/:userId?', courseController.getCoursesByUser);
router.patch('/:moduleId/update', courseController.updateModule);
router.get("/:courseId/modules",courseController.getCourseModelsWithMaterials);
module.exports = router;