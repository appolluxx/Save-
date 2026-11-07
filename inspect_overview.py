import json

with open('d:/Project_SaveRaks/figma_overview.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('File Name:', data.get('name'))
print('Last Modified:', data.get('lastModified'))
pages = data.get('document', {}).get('children', [])
print(f'Total Pages: {len(pages)}')
for page in pages:
    print(f'\n=== PAGE: {page.get("name")} (id: {page.get("id")}) ===')
    for frame in page.get('children', []):
        bounds = frame.get('absoluteBoundingBox', {})
        w = bounds.get('width', 0) if bounds else 0
        h = bounds.get('height', 0) if bounds else 0
        print(f'  - Frame: "{frame.get("name")}" (id: {frame.get("id")}, type: {frame.get("type")}, size: {w}x{h})')
