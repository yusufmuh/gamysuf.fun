"""Generate fourteen original Indonesian result announcements."""
import asyncio,hashlib,json,subprocess
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
if (ROOT/'games/heart').is_dir():
    ROOT=ROOT/'games/heart'
SERVICES={'cinderella':"Cinderella's Fit",'twirl':'Princess Twirl','whisper':'Blossom Whisper','offering':'Sweet Offering','vow':"Knight's Vow",'hug':'Warm Hug','pat':'Pat on Head'}
async def main():
    folder=ROOT/'assets/audio/results';folder.mkdir(parents=True,exist_ok=True);items=[]
    for host in ['zoro','sanji']:
        for sid,name in SERVICES.items():
            text=f'Babes, kamu mendapatkan kartu {name}, bersama {host.title()}!'
            p=folder/f'{host}-{sid}.mp3'
            if not p.exists():
                await edge_tts.Communicate(text,'id-ID-GadisNeural',rate='+3%').save(str(p))
            info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(p)]))
            items.append({'hostId':host,'serviceId':sid,'text':text,'voice':'id-ID-GadisNeural','path':f'/assets/audio/results/{p.name}','duration':float(info['format']['duration']),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
            print(f'Announcement: {host}-{sid}',flush=True)
    (folder/'manifest.json').write_text(json.dumps({'version':1,'source':'Original Indonesian narration synthesized with edge-tts; not a character voice clone','items':items},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
asyncio.run(main())
