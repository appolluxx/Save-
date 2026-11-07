import urllib.request
import json
import os

token = os.environ.get("FIGMA_TOKEN")
if not token:
    raise SystemExit("Set FIGMA_TOKEN in the environment before running this script.")
file_key = 'KbCwYaGDvztXdUAOslOpEn'

screens = {
    'admin': '25:10354',
    'map': '25:10237',
    'leaderboard': '25:10100',
    'profile': '25:9984',
    'shop': '25:9874',
    'submit': '25:9772',
    'vision': '25:9684',
    'app_shell': '9:167',
    'app_shell_student': '9:125',
    'app_shell_teacher': '9:148',
    'onboarding_1': '7:4',
    'onboarding_2': '7:192',
    'role_select': '9:17',
    'login_student': '8:509',
    'register_student': '8:525',
    'login_staff': '9:53',
    'register_staff': '9:73',
}

out_dir = r'd:\Project_SaveRaks\figma_exports'
os.makedirs(out_dir, exist_ok=True)

# 1. Request image renders for all screens
ids_param = ','.join(screens.values())
img_url = f'https://api.figma.com/v1/images/{file_key}?ids={ids_param}&format=png&scale=2'

req = urllib.request.Request(img_url, headers={'X-Figma-Token': token})
with urllib.request.urlopen(req) as resp:
    res_data = json.loads(resp.read().decode('utf-8'))
    images_map = res_data.get('images', {})
    print(f'Received {len(images_map)} rendered image URLs')

for name, node_id in screens.items():
    url = images_map.get(node_id)
    if url:
        dest = os.path.join(out_dir, f'{name}.png')
        urllib.request.urlretrieve(url, dest)
        print(f'Saved {name}.png ({os.path.getsize(dest)} bytes)')
    else:
        print(f'No URL for {name} ({node_id})')

# 2. Also fetch node details JSON for the new app screens
nodes_url = f'https://api.figma.com/v1/files/{file_key}/nodes?ids={ids_param}'
req_nodes = urllib.request.Request(nodes_url, headers={'X-Figma-Token': token})
with urllib.request.urlopen(req_nodes) as resp:
    nodes_data = json.loads(resp.read().decode('utf-8'))
    with open(os.path.join(out_dir, 'nodes_details.json'), 'w', encoding='utf-8') as f:
        json.dump(nodes_data, f, ensure_ascii=False, indent=2)
    print('Saved nodes_details.json')
