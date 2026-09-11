const { spawn } = require("child_process");

class VideoPlayer {
    constructor() {
        this.process = null;
    }

    start(input) {
        if (this.process) {
            this.stop();
        }

        this.process = spawn("ffmpeg", [
            "-i", input,
            "-f", "mpegts",
            "-codec:v", "mpeg1video",
            "-codec:a", "mp2",
            "-"
        ]);

        this.process.on("close", () => {
            this.process = null;
        });

        return this.process.stdout;
    }

    stop() {
        if (!this.process) return;

        this.process.kill("SIGKILL");
        this.process = null;
    }
}

module.exports = VideoPlayer;
