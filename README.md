<p align="center"><img src="logo.svg" width="96" alt="Laptop Lab logo"></p>

# Laptop Lab

An expedition-styled browser app that tests your laptop hardware. Nothing to install. Everything runs in your browser; only the network tests (speed, Wi-Fi stability and website checks) use the internet, and only when you press Start.

## Checks
- **Display**: full-screen color fills for dead pixels and backlight, plus banding, ghosting, backlight-bleed and pixel-sharpness tests and screen info.
- **Camera**: live preview with real resolution and frame rate.
- **Microphone**: level meter with peak hold.
- **Touchpad & mouse**: clicks, double clicks, scroll, pinch, input type and move events per second.
- **Keyboard**: on-screen layout that marks every key you press, held keys and rollover. Works on built-in laptop keyboards.
- **Speakers**: left, right and both-channel tones, pitch choice, a 100 Hz to 10 kHz sweep and output selection (Chrome/Edge).
- **Battery**: charge level and charging state, plus a drain tracker that graphs the level over time and estimates hours left (Chrome, Edge, Opera).
- **Touchscreen & pen** (optional): multi-finger drawing with pressure and tilt readout.
- **Game controller** (optional): live buttons and sticks, plus a vibration test.
- **Network speed**: latency, jitter, download and upload speed using Cloudflare's public speed-test servers (about 20 MB for the quick test, up to about 100 MB for the full test), plus a history of recent runs.
- **Wi-Fi stability**: pings a server twice a second and graphs delay, lost replies and lag spikes. Walk around to find weak spots. (Browsers can't read Wi-Fi signal strength, so this measures real experience.)
- **Website checks** (on the Network page): see whether common sites or any address you type respond, and how fast.
- **Performance**: one-core and all-core CPU benchmark, parallel speedup and memory copy speed.
- **System**: CPU threads, approximate memory, graphics, language, time zone, connection, browser storage, permission states and a test notification.

A **guided run** walks you through every check in order. Checks that find a problem, such as a slow connection, unstable Wi-Fi or low battery, get an orange flag, and the report summarises what needs attention. Switch between the night map and a light **Day theme** from the sidebar. Each completed check earns a stamp on the Home page. The **Field report** page lists every result and can be downloaded as text or JSON, or printed. Results are saved in your browser only.

## Run
Camera and microphone need HTTPS or localhost.

```bash
python3 -m http.server 8000   # open http://localhost:8000
```
Or deploy with GitHub Pages.

Works offline after the first visit and can be installed as an app from Chrome or Edge. The Home page shows which checks your browser supports. Chrome and Edge support everything; Firefox and Safari lack battery info and output selection. Browsers can test hardware but can't change system settings such as brightness or key mappings.

MIT License
