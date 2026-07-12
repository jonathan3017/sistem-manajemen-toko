const express = require("express");
const router = express.Router();
const barangController = require("../controllers/barangController");

router.get("/", barangController.getAllBarang);
router.post("/", barangController.createBarang);
router.patch("/stok", barangController.addStokBarang);

module.exports = router;
