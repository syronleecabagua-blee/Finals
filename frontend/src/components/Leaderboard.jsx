import { useEffect, useState } from "react";
import { getLeaderboard } from "../services/gameService";

const DIFFICULTIES = [
    ["easy", "Easy"],
    ["hard", "Hard"],
    ["superhard", "Super Hard"]
];

function Leaderboard() {
    const [difficulty, setDifficulty] = useState("easy");
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadLeaderboard(selectedDifficulty = difficulty) {
        try {
            setLoading(true);
            setError("");

            const data = await getLeaderboard(selectedDifficulty);
            if (data.success) setLeaderboard(data.leaderboard);
        } catch (error) {
            console.error(error);
            setError("Unable to load leaderboard.");
        } finally {
            setLoading(false);
        }
    }

    function changeDifficulty(value) {
        setDifficulty(value);
        loadLeaderboard(value);
    }

    useEffect(() => {
        loadLeaderboard("easy");
    }, []);

    return (
        <div className="leaderboard-card">
            <div className="leaderboard-header">
                <div className="leaderboard-title">
                    <span className="leaderboard-icon">#</span>
                    <h2>Leaderboard</h2>
                </div>

                <button
                    className="refresh-button"
                    onClick={() => loadLeaderboard()}
                    type="button"
                >
                    ↻ Refresh
                </button>
            </div>

            <div className="leaderboard-tabs">
                {DIFFICULTIES.map(([value, label]) => (
                    <button
                        key={value}
                        className={difficulty === value ? "active" : ""}
                        onClick={() => changeDifficulty(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="leaderboard-message">Loading leaderboard...</div>
            ) : error ? (
                <div className="leaderboard-message error">{error}</div>
            ) : leaderboard.length === 0 ? (
                <div className="leaderboard-message">
                    No scores yet for {difficulty}!
                </div>
            ) : (
                <div className="leaderboard-list">
                    {leaderboard.map((player, index) => (
                        <div
                            className={`leaderboard-row ${index < 3 ? "top-player" : ""}`}
                            key={player.id}
                        >
                            <div
                                className={`rank ${
                                    index === 0
                                        ? "rank-gold"
                                        : index === 1
                                        ? "rank-silver"
                                        : index === 2
                                        ? "rank-bronze"
                                        : "rank-normal"
                                }`}
                            >
                                #{index + 1}
                            </div>

                            <div className="player-info">
                                <strong>{player.playerName}</strong>
                                <span>{player.difficulty}</span>
                            </div>

                            <div className="player-score">
                                <strong>{player.score}</strong>
                                <span>pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Leaderboard;