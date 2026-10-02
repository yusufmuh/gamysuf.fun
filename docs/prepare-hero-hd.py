"""Copy generated originals and encode browser assets without changing artwork."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil

SOURCE = Path(__file__).resolve().parent.parent
GENERATED = Path(r'C:\Users\Yusuf\.codex\generated_images\01a0f680-b509-7f82-970f-d8f4e2d32ef7')
FILES = {'zoro': 'exec-c6ea6528-8d4d-4750-88e7-75bedd8e2bbb.png', 'sanji': 'exec-29ab086e-9ea6-4c3b-9222-d7501619d328.png'}

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> None:
    originals = SOURCE / 'docs' / 'artwork'
    originals.mkdir(parents=True, exist_ok=True)
    specs = json.loads((SOURCE / 'docs' / 'hero-hd-prompts.json').read_text(encoding='utf-8'))
    assets = []
    for host, filename in FILES.items():
        src = GENERATED / filename
        original = originals / f'{host}-hero-hd.png'
        shutil.copy2(src, original)
        image = Image.open(src)
        assert image.mode == 'RGBA' and image.size == (1024, 1536)
        assert image.getchannel('A').getextrema()[0] == 0
        target = SOURCE / 'assets' / 'characters' / f'{host}-hero-hd.webp'
        image.save(target, 'WEBP', quality=95, method=6, exact=True)
        download = Path(r'C:\Users\Yusuf\Downloads') / f'Bpedia-{host.title()}-Full-Body-HD-2026-10-03.png'
        shutil.copy2(src, download)
        spec = next(item for item in specs if item['key'] == f'heart_{host}_hd')
        assets.append({'host':host, 'image':f'/assets/characters/{target.name}', 'width':1024, 'height':1536, 'alpha':True, 'original':str(original), 'originalSha256':digest(original), 'runtimeSha256':digest(target), 'bytes':target.stat().st_size, 'prompt':spec['prompt'], 'reference':f'/assets/characters/{host}.webp', 'referenceSha256':digest(SOURCE / 'assets' / 'characters' / f'{host}.webp'), 'download':str(download)})
    manifest = {'schema':1, 'date':'2026-10-03', 'generator':'OpenAI built-in image_gen', 'mode':'reference-guided generation', 'assets':assets, 'invariants':['Adult characters only', 'Full body and both feet retained', 'Transparent alpha', 'Bipy owner artwork unchanged'], 'encoding':'WebP quality 95, no cropping, resizing or creative postprocessing'}
    (SOURCE / 'assets' / 'characters' / 'hero-hd-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps([{'host':a['host'],'dimensions':[a['width'],a['height']],'bytes':a['bytes']} for a in assets]))

if __name__ == '__main__':
    main()
