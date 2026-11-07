import requests
import json
import os

token = os.environ.get("FIGMA_TOKEN")
if not token:
    raise SystemExit("Set FIGMA_TOKEN in the environment before running this script.")
file_key = "KbCwYaGDvztXdUAOslOpEn"
headers = {"X-Figma-Token": token}

url = f"https://api.figma.com/v1/files/{file_key}/images"
res = requests.get(url, headers=headers)
data = res.json()
print("Images response meta:", data.get('error', 'OK'))
images_map = data.get('meta', {}).get('images', {})

target_dir = os.path.join("apps", "web", "public", "assets", "figma")
os.makedirs(target_dir, exist_ok=True)

named_refs = {
    "10ed042fa8dec242e7541349ac93a001fdf204e5": "mascot-plant.png",
    "086d7fa9a64a2e80e66d404576e4ff2cd8e53fcb": "evidence-bottles.jpg",
    "f7699df28fdb24455f37dd99b998c55384f46a3f": "sample-bottles.jpg",
    "bf0274a9eac4a1bbfb62fb138f3bbb2bdc694eb7": "sample-bottles-vision.jpg",
    "de06a878282a460085d60d091dd6b8be0ca9e828": "pixel-mascots.png",
}

for ref, img_url in images_map.items():
    name = named_refs.get(ref, f"asset-{ref[:8]}.png")
    out_path = os.path.join(target_dir, name)
    print(f"Downloading {ref} -> {out_path} ...")
    r = requests.get(img_url)
    if r.status_code == 200:
        with open(out_path, "wb") as f:
            f.write(r.content)
        print(f"Saved {name} ({len(r.content)} bytes)")
    else:
        print(f"Failed to download {name}: {r.status_code}")
