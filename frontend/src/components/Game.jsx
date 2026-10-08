import { useEffect, useRef, useState } from "react";
import {
    checkAnswer,
    getNewWord,
    saveScore,
    getLeaderboard
} from "../services/gameService";

const CORRECT_MEMES = [
    "/memes/correct/correct1.jpg",
    "/memes/correct/correct2.jpg",
    "/memes/correct/correct3.jpg",
    "/memes/correct/correct4.jpg",
    "/memes/correct/correct5.jpg"
];

const WRONG_MEMES = [
    "/memes/wrong/wrong1.jpg",
    "/memes/wrong/wrong2.jpg",
    "/memes/wrong/wrong3.jpg",
    "/memes/wrong/wrong4.jpg",
    "/memes/wrong/wrong5.jpg"
];

// NEW: Congratulations videos are stored inside /public/videos/congrats.
const CONGRATS = [
    "/videos/congrats/cong1.mp4"
];

const SKIP_LIMITS = {
    easy: 1,
    hard: 2,
    superhard: 3
};

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function getSkipLimit(difficulty) {
    return SKIP_LIMITS[difficulty] ?? SKIP_LIMITS.easy;
}

function Game() {
    const answerInputRef = useRef(null);
    const nextWordTimer = useRef(null);
    const initialLoadRef = useRef(false);

    const [playerName, setPlayerName] = useState("");
    const [difficulty, setDifficulty] = useState("easy");
    const [topic, setTopic] = useState("tech");
    const [word, setWord] = useState("");
    const [scrambledWord, setScrambledWord] = useState("");
    const [answer, setAnswer] = useState("");
    const [hint, setHint] = useState("");
    const [showHint, setShowHint] = useState(false);
    const [freeHintAvailable, setFreeHintAvailable] = useState(true);
    const [score, setScore] = useState(0);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isShowingResult, setIsShowingResult] = useState(false);
    const [resultType, setResultType] = useState("");
    const [resultMeme, setResultMeme] = useState("");

    // NEW: Controls the #1 leaderboard congratulations video popup.
    const [showCongrats, setShowCongrats] = useState(false);

    // NEW: Reference to the congratulations video so it can be played with sound.
    const congratsVideoRef = useRef(null);

    // NEW: Start the congratulations video automatically and keep it playing.
    // Controls are removed below, and if the browser pauses the video, we try to resume it.
    useEffect(() => {
        if (!showCongrats || !congratsVideoRef.current) {
            return;
        }

        const video = congratsVideoRef.current;
        video.muted = false;

        const startVideo = async () => {
            try {
                await video.play();
            } catch (error) {
                // NEW: Some browsers block autoplay with sound.
                // The video remains unmuted and will play once the browser permits it.
                console.warn("Congratulations video autoplay was blocked:", error);
            }
        };

        startVideo();
    }, [showCongrats]);

    const [skipsRemaining, setSkipsRemaining] = useState(
        getSkipLimit("easy")
    );

    async function loadNewWord(
        selectedDifficulty = difficulty,
        selectedTopic = topic
    ) {
        try {
            setLoading(true);

            const data = await getNewWord(
                selectedDifficulty,
                selectedTopic
            );

            if (data.success) {
                setWord(data.word);
                setScrambledWord(
                    data.scrambledWord
                );
                setHint(data.hint || "");
                setShowHint(false);
                setAnswer("");
                setMessage("");
            }
        } catch (error) {
            console.error(error);
            setMessage(
                "Unable to load a new word."
            );
        } finally {
            setLoading(false);
        }
    }

    // Load the first word.
    useEffect(() => {
        if (initialLoadRef.current) return;

        initialLoadRef.current = true;
        loadNewWord("easy");

        return () => {
            if (nextWordTimer.current) {
                clearTimeout(nextWordTimer.current);
            }
        };
    }, []);

    // Automatically focus the ANSWER box whenever a new word appears.
    useEffect(() => {
        if (
            !word ||
            loading ||
            gameOver ||
            isShowingResult
        ) {
            return;
        }

        requestAnimationFrame(() => {
            answerInputRef.current?.focus();
        });
    }, [
        word,
        loading,
        gameOver,
        isShowingResult
    ]);

    // Close the WRONG answer popup when any keyboard key is pressed.
    useEffect(() => {
        if (
            resultType !== "wrong" ||
            !isShowingResult
        ) {
            return;
        }

        const timer = setTimeout(()=> {
            setIsShowingResult(false);
            setResultType("");
            setResultMeme("");
        }, 1500)

        return () => {
            clearTimeout(timer);
        };

        // function handleWrongResultKey(event) {
        //     event.preventDefault();

        //     setIsShowingResult(false);
        //     setResultType("");
        //     setResultMeme("");
        // }

        // window.addEventListener(
        //     "keydown",
        //     handleWrongResultKey
        // );

        // return () => {
        //     window.removeEventListener(
        //         "keydown",
        //         handleWrongResultKey
        //     );
        // };
    }, [
        resultType,
        isShowingResult
    ]);

    function handleDifficultyChange(newDifficulty) {
        if (isShowingResult) return;

        setDifficulty(newDifficulty);
        setSkipsRemaining(
            getSkipLimit(newDifficulty)
        );
        setScore(0);
        setGameOver(false);
        setResultType("");
        setResultMeme("");
        setIsShowingResult(false);
        setMessage("");
        setAnswer("");

        loadNewWord(
            newDifficulty,
            topic
        );
    }

    // NEW: After saving, check whether this player is currently #1.
    // The congratulations video only appears when the saved score is #1.
    async function checkForTopOne(playerScore) {
        try {
            const data = await getLeaderboard(difficulty);
            const topPlayer = data?.leaderboard?.[0];

            const isTopOne =
                data?.success &&
                topPlayer &&
                topPlayer.playerName?.trim().toLowerCase() ===
                    playerName.trim().toLowerCase() &&
                Number(topPlayer.score) === Number(playerScore);

            if (isTopOne) {
                // NEW: Hide the wrong-answer meme before showing congratulations.
                setIsShowingResult(false);
                setResultType("");
                setResultMeme("");
                setShowCongrats(true);
            }
        } catch (error) {
            // The game should still finish normally if the leaderboard check fails.
            console.error("Failed to check #1 leaderboard position:", error);
        }
    }

    async function handleGameOver() {
        setGameOver(true);
        setIsShowingResult(true);
        setMessage(
            "Ahh yuga sala, G lng bawi dason."
        );

        try {
            await saveScore(
                playerName,
                score,
                difficulty
            );

            // NEW: Only show congratulations if the saved score is #1.
            await checkForTopOne(score);
        } catch (error) {
            console.error(
                "Failed to save imo score:",
                error
            );

            setMessage(
                "Can't save your score."
            );
        }
    }

    async function handleCheckAnswer() {
        if (
            isShowingResult ||
            gameOver
        ) {
            return;
        }

        if (!answer.trim()) {
            setMessage(
                "Answer danay hehe."
            );
            return;
        }

        if (!playerName.trim()) {
            setMessage(
                "Your name fo."
            );
            return;
        }

        try {
            const data = await checkAnswer(
                word,
                answer
            );

            // CORRECT ANSWER
            if (data.correct) {
                setScore(
                    (previousScore) =>
                        previousScore + 1
                );

                setResultType("correct");

                setResultMeme(
                    randomItem(CORRECT_MEMES)
                );

                setIsShowingResult(true);

                setMessage("Tsakto!");

                // Correct popup disappears automatically.
                nextWordTimer.current =
                    setTimeout(() => {
                        setIsShowingResult(false);
                        setResultType("");
                        setResultMeme("");
                        
                        loadNewWord(
                            difficulty
                        );
                    }, 1500);
            }

            // WRONG ANSWER
            else {
                setResultType("wrong");

                setResultMeme(
                    randomItem(WRONG_MEMES)
                );

                setIsShowingResult(true);

                // The popup stays open.
                // The player must press any key.
                await handleGameOver();
            }
        } catch (error) {
            console.error(error);

            setMessage(
                "Hmm something is wrong."
            );
        }
    }

    async function handleEndGame() {
        if (gameOver || isShowingResult || loading) {
            return;
        }

        // Player must enter a name before ending.
        if (!playerName.trim()) {
            setMessage("Your name fo.");
            return;
        }

        // Stop any pending next-word timer.
        if (nextWordTimer.current) {
            clearTimeout(nextWordTimer.current);
        }

        try {
            // Save the current score immediately.
            await saveScore(
                playerName,
                score,
                difficulty
            );

            // NEW: Check #1 after the score has been saved.
            await checkForTopOne(score);

            // End the game.
            setGameOver(true);
            setIsShowingResult(false);
            setResultType("");
            setResultMeme("");
            setShowHint(false);
            setMessage("Game ended! Your score has been saved.");
        } catch (error) {
            console.error(
                "Failed to save score:",
                error
            );

            setMessage("Can't save your score.");
        }
    }

    function handleSkip() {
        if (
            isShowingResult ||
            gameOver ||
            loading
        ) {
            return;
        }

        const remaining =
            skipsRemaining - 1;

        setSkipsRemaining(remaining);
        setAnswer("");
        loadNewWord(
            difficulty,
            topic
        );
    }

    function handleHint() {
    if (
        isShowingResult ||
        loading ||
        gameOver ||
        !hint
    ) {
        return;
    }

    // One free hint at the very beginning
    if (freeHintAvailable && score === 0) {
        setFreeHintAvailable(false);
        setShowHint(true);
        return;
    }

    // After the free hint, every hint costs 1 point
    if (score <= 0) {
        return;
    }

    setScore((previousScore) => previousScore - 1);
    setShowHint(true);
}

    function handleRestart() {
        if (nextWordTimer.current) {
            clearTimeout(
                nextWordTimer.current
            );
        }

        setScore(0);
        setGameOver(false);
        setIsShowingResult(false);
        setResultType("");
        setResultMeme("");
        setShowCongrats(false); // NEW: close congratulations when restarting
        setMessage("");
        setAnswer("");

        setSkipsRemaining(
            getSkipLimit(difficulty)
        );

        loadNewWord(difficulty);
    }

    return (
        <div className="game-container">

            <div className="game-card">

                {/* HEADER */}
                <div className="game-header">
                    <p>WORD SCRAMBLE</p>

                    <h1>
                        Unscramble It!
                    </h1>
                </div>

                {/* PLAYER NAME + SCORE */}
                <div className="player-score-row">

                    <div className="player-section">
                        <label htmlFor="playerName">
                            Player Name
                        </label>

                        <input
                            id="playerName"
                            type="text"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(event) =>
                                setPlayerName(
                                    event.target.value
                                )
                            }
                            disabled={gameOver}
                        />
                    </div>

                    <div className="compact-score">
                        <span>
                            SCORE
                        </span>

                        <strong>
                            {score}
                        </strong>
                    </div>

                </div>

                {/* DIFFICULTY */}
                <div className="difficulty-section">

                    <div className="difficulty-buttons">

                        {[
                            ["easy", "Easy"],
                            ["hard", "Hard"],
                            ["superhard", "Super Hard"]
                        ].map(
                            ([
                                value,
                                label
                            ]) => (
                                <button
                                    key={value}
                                    className={
                                        difficulty ===
                                        value
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        handleDifficultyChange(
                                            value
                                        )
                                    }
                                    disabled={
                                        isShowingResult
                                    }
                                >
                                    {label}
                                </button>
                            )
                        )}

                    </div>

                </div>

                <div className="topic-section">
                    <p className="topic-label">TOPIC</p>

                    <div className="topic-buttons">
                        <button
                            type="button"
                            className={topic === "tech" ? "active" : ""}
                            onClick={() => {
                                setTopic("tech");
                                setScore(0);
                                setSkipsRemaining(getSkipLimit(difficulty));
                                loadNewWord(difficulty, "tech");
                            }}
                            disabled={isShowingResult}
                        >
                            Tech &amp; Programming
                        </button>

                        <button
                            type="button"
                            className={topic === "general" ? "active" : ""}
                            onClick={() => {
                                setTopic("general");
                                setScore(0);
                                setSkipsRemaining(getSkipLimit(difficulty));
                                loadNewWord(difficulty, "general");
                            }}
                            disabled={isShowingResult}
                        >
                            General Knowledge
                        </button>

                        <button
                            type="button"
                            className={topic === "science" ? "active" : ""}
                            onClick={() => {
                                setTopic("science");
                                setScore(0);
                                setSkipsRemaining(getSkipLimit(difficulty));
                                loadNewWord(difficulty, "science");
                            }}
                            disabled={isShowingResult}
                        >
                            Science
                        </button>
                    </div>
                </div>

                {/* SCRAMBLED WORD */}
                <div className="word-section">

                    <p className="word-label">
                        SCRAMBLED WORD
                    </p>

                    <div className="letters">

                        {loading ? (
                            <div className="loading-word">
                                Loading...
                            </div>
                        ) : (
                            scrambledWord
                                .split("")
                                .map(
                                    (
                                        letter,
                                        index
                                    ) => (
                                        <div
                                            className="letter"
                                            key={`${letter}-${index}`}
                                        >
                                            {letter.toUpperCase()}
                                        </div>
                                    )
                                )
                        )}

                    </div>

                </div>

                {/* ANSWER */}
                {!gameOver && (
                    <div className="answer-section">

                        <input
                            ref={answerInputRef}
                            type="text"
                            placeholder="Type your answer..."
                            value={answer}
                            onChange={(event) =>
                                setAnswer(
                                    event.target.value
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key ===
                                    "Enter"
                                ) {
                                    handleCheckAnswer();
                                }
                            }}
                            disabled={
                                isShowingResult ||
                                loading
                            }
                        />

                        <button
                            className="check-button"
                            onClick={
                                handleCheckAnswer
                            }
                            disabled={
                                isShowingResult ||
                                loading
                            }
                        >
                            Check Answer
                        </button>

                    </div>
                )}

                {/* MESSAGE */}
                {message && (
                    <p
                        className={`message ${
                            resultType ===
                            "wrong"
                                ? "wrong"
                                : ""
                        }`}
                    >
                        {message}
                    </p>
                )}

                {/* GAME CONTROLS */}
                {!gameOver && (
                    <div className="game-controls">

                        {/* LEFT SIDE */}
                        <div className="game-controls-left">

                            <button
                                type="button"
                                className="hint-button"
                                onClick={handleHint}
                                disabled={
                                    isShowingResult ||
                                    loading ||
                                    gameOver ||
                                    !hint ||
                                    (score <= 0 && !freeHintAvailable)
                                }
                            >
                                {freeHintAvailable && score === 0 ? "Free Hint" : "Hint -1"}
                            </button>

                            <button
                                type="button"
                                className="skip-button"
                                onClick={handleSkip}
                                disabled={
                                    isShowingResult ||
                                    loading ||
                                    skipsRemaining <= 0
                                }
                            >
                                Skip
                            </button>

                            <span className="skip-counter">
                                {skipsRemaining}{" "}
                                skip
                                {skipsRemaining === 1
                                    ? ""
                                    : "s"}{" "}
                                left
                            </span>

                        </div>

                        {/* RIGHT SIDE */}
                        <button
                            type="button"
                            className="end-button"
                            onClick={handleEndGame}
                            disabled={
                                isShowingResult ||
                                loading
                            }
                        >
                            End Game
                        </button>

                    </div>
                )}

                {/* PLAY AGAIN */}
                {gameOver && (
                    <button
                        className="restart-button"
                        onClick={
                            handleRestart
                        }
                    >
                        ↻ Play Again
                    </button>
                )}

            </div>

            {/* RESULT IMAGE POPUP */}
            {isShowingResult &&
                resultMeme && (
                    <div
                        className="result-popup"
                        role="dialog"
                        aria-modal="true"
                    >
                        <img
                            src={resultMeme}
                            alt=""
                            className="result-popup-image"
                        />
                    </div>
                )}

            {/* NEW: #1 CONGRATULATIONS VIDEO POPUP */}
            {showCongrats && (
                <div
                    className="congrats-popup"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="congrats-content">

                        {/* NEW: Congratulations message above the video */}
                        <h2 className="congrats-message">
                            <span className="emoji-left">🎉</span>
                            CONGRATULATIONS!
                            <span className="emoji-right">🎉</span>
                        </h2>
                        <p className="congrats-submessage">
                            you're the #1 on the leaderboard!
                        </p>

                        <video
                            ref={congratsVideoRef}
                            className="congrats-video"
                            src={randomItem(CONGRATS)}
                            autoPlay
                            playsInline
                            controls={false}
                            onPause={(event) => {
                                if (!event.currentTarget.ended) {
                                    event.currentTarget
                                        .play()
                                        .catch(() => {});
                                }
                            }}
                            onEnded={() => setShowCongrats(false)}
                        />
                    </div>
                </div>
            )}

            {/* HINT POPUP */}
            {showHint && hint && (
                <div
                    className="hint-popup"
                    onClick={() =>
                        setShowHint(false)
                    }
                >
                    <div
                        className="hint-box"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <h3>Hint</h3>

                        <p>
                            {hint}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setShowHint(false)
                            }
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Game;