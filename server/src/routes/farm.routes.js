const express = require('express');
const router = express.Router();
const {
  getFarms,
  getFarm,
  createFarm,
  updateFarm,
  deleteFarm,
  getFarmStats,
  addFarmMember,
  removeFarmMember,
  updateFarmMember
} = require('../controllers/farm.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getFarms)
  .post(createFarm);

router.route('/:id')
  .get(getFarm)
  .put(updateFarm)
  .delete(deleteFarm);

router.route('/:id/stats')
  .get(getFarmStats);

router.route('/:id/members')
  .post(addFarmMember)
  .put(updateFarmMember)
  .delete(removeFarmMember);

module.exports = router;