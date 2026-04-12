const express = require("express");
const cors = require("cors");

const {parseData, getAgent} = require("./agentParser")

const app = express();
app.use(cors());

app.get("/api/agents/:id", (req, res) => {
    const result = getAgent(req.params.id);
    if (!result) return res.status(404).json({error: "Not found!"});
    res.json(result);
});

parseData();

app.listen(3001);