import Game from "./components/Game.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import "./App.css";

function App() {
    return (
        <main className="app">
            <div className="app-layout">
                <aside className="leaderboard-side">
                    <Leaderboard />
                </aside>

                <section className="game-side">
                    <Game />
                </section>
            </div>
        </main>
    );
}

export default App;