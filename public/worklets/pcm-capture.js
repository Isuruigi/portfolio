// Turns microphone audio into 16-bit PCM chunks for Gemini Live.
// Runs on the audio thread; posts one ~100 ms chunk at a time.
class PcmCapture extends AudioWorkletProcessor {
    constructor() {
        super();
        this.size = Math.round(sampleRate / 10);
        this.buffer = new Int16Array(this.size);
        this.filled = 0;
    }

    process(inputs) {
        const channel = inputs[0] && inputs[0][0];
        if (!channel) return true;
        for (let i = 0; i < channel.length; i++) {
            const s = Math.max(-1, Math.min(1, channel[i]));
            this.buffer[this.filled++] = s < 0 ? s * 0x8000 : s * 0x7fff;
            if (this.filled === this.size) {
                this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
                this.buffer = new Int16Array(this.size);
                this.filled = 0;
            }
        }
        return true;
    }
}

registerProcessor("pcm-capture", PcmCapture);
