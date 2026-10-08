const express = require("express");
const router = express.Router();

const {
    getRandomWord,
    checkAnswer,
    saveScore,
    getLeaderboard
} = require("../controllers/gameController");

router.get("/new", getRandomWord);
router.post("/check", checkAnswer);
router.post("/score", saveScore);

// NEW: Keep /save_score working too.
// This matches the URL used by older frontend code and prevents a 404.
router.post("/save_score", saveScore);
router.get("/leaderboard", getLeaderboard);

module.exports = router;