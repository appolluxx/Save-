import json

with open('figma_exports/nodes_details.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def inspect_nodes(node, screen_name):
    name = node.get('name', '')
    node_id = node.get('id', '')
    fills = node.get('fills', [])
    for fill in fills:
        if fill.get('type') == 'IMAGE':
            print(f"[{screen_name}] Image Fill in '{name}' (ID: {node_id}), imageRef: {fill.get('imageRef')}")
    for child in node.get('children', []):
        inspect_nodes(child, screen_name)

for nid, nval in data.get('nodes', {}).items():
    doc = nval.get('document', {})
    inspect_nodes(doc, doc.get('name', ''))
