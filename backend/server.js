const express = require("express");
const cors = require("cors");

const gameRoutes = require("./routes/gameRoutes");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/game", gameRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Word Scramble API is working!"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});