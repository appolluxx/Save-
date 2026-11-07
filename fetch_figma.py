import urllib.request
import json
import os

token = os.environ.get("FIGMA_TOKEN")
if not token:
    raise SystemExit("Set FIGMA_TOKEN in the environment before running this script.")
file_key = 'KbCwYaGDvztXdUAOslOpEn'
url = f'https://api.figma.com/v1/files/{file_key}'

req = urllib.request.Request(url, headers={'X-Figma-Token': token})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print('SUCCESS! File Name:', data.get('name'))
        print('Last Modified:', data.get('lastModified'))
        pages = data.get('document', {}).get('children', [])
        print('Pages count:', len(pages))
        for p in pages:
            print(f'Page: {p.get("name")} (id: {p.get("id")}) with {len(p.get("children", []))} top-level nodes')
            for c in p.get('children', []):
                print(f'   Node: [{c.get("type")}] "{c.get("name")}" (id: {c.get("id")})')
        with open('d:/Project_SaveRaks/figma_full_export.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print('Saved to d:/Project_SaveRaks/figma_full_export.json')
except Exception as e:
    print('ERROR:', e)
