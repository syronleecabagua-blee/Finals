const words = require("../data/words");
const hints = require("../data/hints");
const db = require("../config/database");

const wordPools = {
    tech: {
        easy: [],
        hard: [],
        superhard: []
    },
    general: {
        easy: [],
        hard: [],
        superhard: []
    },
    science: {
        easy: [],
        hard: [],
        superhard: []
    }
};

const VALID_TOPICS = Object.keys(wordPools);

const VALID_DIFFICULTIES = [
    "easy",
    "hard",
    "superhard"
];

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];
    }

    return result;
}

function getNextWord(topic, difficulty) {
    // If there are no words left, create a new shuffled deck
    if (wordPools[topic][difficulty].length === 0) {
        wordPools[topic][difficulty] = shuffle(
            words[topic][difficulty]
        );
    }

    // Take one word from the shuffled deck
    return wordPools[topic][difficulty].pop();
}

function scrambleWord(word) {
    let scrambled = word;

    while (
        scrambled === word &&
        word.length > 1
    ) {
        scrambled = shuffle(
            word.split("")
        ).join("");
    }

    return scrambled;
}

// GET NEW WORD
function getRandomWord(req, res) {
    const topic = req.query.topic || "tech";
    const difficulty = req.query.difficulty || "easy";

    if (!VALID_TOPICS.includes(topic)) {
        return res.status(400).json({
            success: false,
            message: "Invalid topic."
        });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({
            success: false,
            message: "Invalid difficulty."
        });
    }

    if (
        !words[topic] ||
        !words[topic][difficulty] ||
        !words[topic][difficulty].length
    ) {
        return res.status(400).json({
            success: false,
            message: "No words found for this topic and difficulty."
        });
    }

    // Pick a completely random word every request
    const word = getNextWord(topic, difficulty);

    const hint =
        hints[topic]?.[difficulty]?.[word] ||
        "Think about what this word is related to.";

    res.json({
        success: true,
        word,
        scrambledWord: scrambleWord(word),
        hint,
        topic,
        difficulty
    });
}

// CHECK ANSWER
function checkAnswer(req, res) {
    const {
        word,
        answer
    } = req.body;

    if (!word || !answer) {
        return res.status(400).json({
            success: false,
            correct: false,
            message:
                "Please provide an answer."
        });
    }

    const correct =
        word.trim().toLowerCase() ===
        answer.trim().toLowerCase();

    res.json({
        success: true,
        correct
    });
}

// SAVE SCORE
function saveScore(req, res) {
    const {
        playerName,
        score,
        difficulty
    } = req.body;

    if (
        !playerName ||
        score === undefined ||
        !difficulty
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Player name, score, and difficulty are required."
        });
    }

    const sql = `
        INSERT INTO scores
        (
            player_name,
            score,
            difficulty
        )
        VALUES (?, ?, ?)

        ON DUPLICATE KEY UPDATE
            score = VALUES(score),
            created_at = CURRENT_TIMESTAMP
    `;

    db.query(
        sql,
        [
            playerName.trim(),
            score,
            difficulty
        ],
        (error) => {
            if (error) {
                console.error(
                    "Error saving score:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to save score."
                });
            }

            res.json({
                success: true,
                message:
                    "Score saved successfully!"
            });
        }
    );
}

// GET LEADERBOARD
function getLeaderboard(req, res) {
    const difficulty =
        req.query.difficulty || "easy";

    if (
        !VALID_DIFFICULTIES.includes(
            difficulty
        )
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid difficulty."
        });
    }

    const sql = `
        SELECT
            id,
            player_name AS playerName,
            score,
            difficulty
        FROM scores
        WHERE difficulty = ?
        ORDER BY
            score DESC,
            created_at ASC
        LIMIT 10
    `;

    db.query(
        sql,
        [difficulty],
        (error, results) => {
            if (error) {
                console.error(
                    "Error getting leaderboard:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to load leaderboard."
                });
            }

            res.json({
                success: true,
                difficulty,
                leaderboard: results
            });
        }
    );
}

module.exports = {
    getRandomWord,
    checkAnswer,
    saveScore,
    getLeaderboard
};