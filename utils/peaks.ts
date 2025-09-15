// Cross-platform simple peaks generator for small audio clips
// Returns an array of N normalized values [0..1]
export async function computePeaksFromUri(
  uri: string,
  bars: number = 28
): Promise<number[]> {
  try {
    if (typeof window !== "undefined" && typeof (window as any).AudioContext !== "undefined") {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const res = await fetch(uri);
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const channelData = audioBuf.getChannelData(0);
      const samplesPerBar = Math.floor(channelData.length / bars);
      const peaks: number[] = [];
      for (let i = 0; i < bars; i++) {
        const start = i * samplesPerBar;
        const end = Math.min(channelData.length, start + samplesPerBar);
        let max = 0;
        for (let j = start; j < end; j++) {
          const v = Math.abs(channelData[j]);
          if (v > max) max = v;
        }
        peaks.push(max);
      }
      // normalize to 0..1
      const maxPeak = peaks.reduce((m, v) => (v > m ? v : m), 0) || 1;
      return peaks.map((p) => Math.max(0, Math.min(1, p / maxPeak)));
    }
  } catch {
    // ignore and fallback
  }
  // Native or fallback: generate pseudo peaks by sampling bytes via fetch as blob
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const reader = new FileReader();
    const arrBuf: ArrayBuffer = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const bytes = new Uint8Array(arrBuf);
    const step = Math.max(1, Math.floor(bytes.length / bars));
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      let count = 0;
      const start = i * step;
      const end = Math.min(bytes.length, start + step);
      for (let j = start; j < end; j++) {
        sum += bytes[j];
        count++;
      }
      const avg = count ? sum / count : 0;
      peaks.push(avg / 255);
    }
    return peaks.map((p) => Math.max(0, Math.min(1, p)));
  } catch {
    // Last resort: random-ish stable values derived from uri hash
    const seed = Array.from(uri).reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
    const peaks: number[] = [];
    let x = seed;
    for (let i = 0; i < bars; i++) {
      x = (1103515245 * x + 12345) % 2147483648;
      peaks.push(((x / 2147483648) * 0.8) + 0.1); // 0.1..0.9
    }
    return peaks;
  }
}
