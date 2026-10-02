"""Encode owner-supplied duo artwork as calm, full-body card loops.

This preserves the original illustration. These loops are motion graphics,
not newly generated articulated Gemini video. Gemini masters are documented
separately and can replace a loop after visual verification.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1] / 'games/heart'
FFMPEG = Path(r'C:\Users\Yusuf\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe')
SERVICES = ['cinderella', 'twirl', 'whisper', 'offering', 'vow', 'hug', 'pat']
OUTPUT = ROOT / 'assets/video/moments'

def encode(pair: tuple[str, str]) -> dict:
    host, service = pair
    artwork = ROOT / f'assets/stickers/{host}-{service}.webp'
    output = OUTPUT / f'{host}-{service}-bipy.mp4'
    color = '0x0e302b' if host == 'zoro' else '0x36220f'
    filter_graph = '[1:v]scale=680:760:force_original_aspect_ratio=decrease,format=rgba[art];[0:v][art]overlay=x=(W-w)/2+6*sin(2*PI*t/5):y=(H-h)/2-12+12*cos(2*PI*t/5):format=auto,format=yuv420p[out]'
    cmd = [str(FFMPEG), '-y', '-v', 'error', '-f', 'lavfi', '-i', f'color=c={color}:s=720x900:r=24:d=5', '-loop', '1', '-i', str(artwork), '-filter_complex', filter_graph, '-map', '[out]', '-t', '5', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
    subprocess.run(cmd, check=True)
    result = {'host': host, 'service': service, 'file': output.relative_to(ROOT).as_posix(), 'source': artwork.relative_to(ROOT).as_posix(), 'sourceSHA256': hashlib.sha256(artwork.read_bytes()).hexdigest(), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size, 'kind': 'owner-artwork-motion-graphics'}
    print(f'{host}-{service}: encoded', flush=True)
    return result

if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        assets = list(pool.map(encode, [(h, s) for h in ['zoro', 'sanji'] for s in SERVICES]))
    manifest = {'scope': '14 motion graphics loops from the supplied chibi Bipy duo scenes; original artwork and proportions preserved. No articulated Gemini generation claim.', 'encoding': {'dimensions': [720, 900], 'durationSeconds': 5, 'framesPerSecond': 24, 'codec': 'H264/libx264', 'audio': 'none'}, 'assets': assets}
    (OUTPUT / 'bipy-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
