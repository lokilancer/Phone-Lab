<p align="center">
  <img src="logo.svg" width="96" alt="Phone Lab logo">
</p>

<h1 align="center">Phone Lab</h1>

<p align="center">
  <a href="https://lokilancer.github.io/Phone-Lab/">
    <img src="https://img.shields.io/badge/Try_it_live-Open_Phone_Lab-ff7a1a?style=for-the-badge" alt="Try Phone Lab live">
  </a>
</p>

<p align="center">
  Test your phone's hardware right in the browser. Built for Android, with iPhone support planned.<br>
  Nothing to install. Everything runs on your phone; only the network checks use the internet, and only when you press Start.
</p>

## Checks

- **Touch screen**: cover the screen to find dead zones, and test multi-touch.
- **Display**: color fills for dead or stuck pixels and burn-in, a banding test, refresh-rate meter, color gamut and HDR detection.
- **Cameras**: back and front camera, real resolution and frame rate, flashlight and zoom support, test photo.
- **Microphone**: live level meter with peak hold.
- **Speakers**: left, right and both tones, pitch choice and a 100 Hz to 10 kHz sweep.
- **Vibration**: four patterns, and you confirm whether you felt them.
- **Motion sensors**: accelerometer, gyroscope, total force and a shake counter.
- **Compass & level**: heading dial and a spirit level.
- **GPS location**: time to first fix and accuracy, plus live tracking. Coordinates are never saved or sent.
- **Battery**: level, charging state, and measured charging speed or drain while the page is open.
- **Network speed**: latency, jitter, download and upload using Cloudflare's speed servers.
- **Connection stability**: live graph of delay, lost replies and lag spikes. Walk around to find weak signal.
- **Bluetooth & NFC** (optional): find a Bluetooth device and read an NFC tag.
- **System**: phone model, Android version, memory, graphics, storage limit, permissions and which features your browser supports.

A guided run walks through every check, orange flags mark problems, and the report can be shared from your phone's share sheet, downloaded or copied. There is a night and a day theme, and the app works offline after the first visit.

## Run it

Camera, microphone, sensors and location need HTTPS or localhost.

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

Or deploy with GitHub Pages. On Android, open it in Chrome and use **Add to home screen** to install it.

## Browser support

Chrome on Android supports everything. Other Android browsers support most checks. Battery, Bluetooth, NFC and vibration are limited to Chrome-based browsers. iPhone support is planned, because Safari limits sensors, vibration, battery and Bluetooth.


## Privacy

Camera, microphone, location and motion checks ask for permission and never record or upload anything. The only network use is the Network speed and Connection stability checks, which talk to Cloudflare's speed servers when you press Start.

MIT License
