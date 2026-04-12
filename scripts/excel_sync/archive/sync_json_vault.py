import os
import json
import requests
import re
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

GITHUB_RAW_BASE = "https://raw.githubusercontent.com/manyaug/manya-react-assets/main/"
CDN_BASE = "https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@main/"

# Regex for common assets
ASSET_REGEX = re.compile(r'["\']([^"\']+\.(?:glb|png|jpg|jpeg|webp|svg|mp3|mp4))["\']')

def normalize_asset_url(match_path, current_file_path):
    if match_path.startswith(('http://', 'https://')):
        if "supabase.co" in match_path:
            filename = match_path.split("/")[-1]
            current_dir = os.path.dirname(current_file_path)
            return f"{CDN_BASE}{current_dir}/{filename}"
        return match_path
    
    clean_path = match_path.lstrip("./")
    if "/" not in clean_path:
        current_dir = os.path.dirname(current_file_path)
        return f"{CDN_BASE}{current_dir}/{clean_path}"
    
    if clean_path.startswith(('assets/', 'content/', 'images/', 'data/')):
        return f"{CDN_BASE}{clean_path}"
    
    current_dir = os.path.dirname(current_file_path)
    return f"{CDN_BASE}{current_dir}/{clean_path}"

def process_file(file_path):
    print(f"Processing: {file_path}")
    raw_url = f"{GITHUB_RAW_BASE}{file_path}"
    
    try:
        response = requests.get(raw_url)
        if response.status_code != 200:
            print(f"  [Error] HTTP {response.status_code}")
            return None
        
        data = response.json()
        parts = file_path.split("/")
        subject = parts[1].upper() if len(parts) > 1 else "UNKNOWN"
        topic = parts[2] if len(parts) > 2 else "GENERAL"
        subtopic = parts[3] if len(parts) > 3 else "QUEST_1"
        engine_type = data.get("engineType", data.get("mode", "SIMULATION")).upper()
        
        raw_text = response.text
        found_assets = ASSET_REGEX.findall(raw_text)
        repaired_assets = [normalize_asset_url(a, file_path) for a in found_assets]
        
        def url_replacer(match):
            original = match.group(1)
            return f'"{normalize_asset_url(original, file_path)}"'
        
        repaired_json_text = ASSET_REGEX.sub(url_replacer, raw_text)
        repaired_data = json.loads(repaired_json_text)

        item_type = "SIMULATION"
        if "note" in file_path.lower() or "study" in file_path.lower():
            item_type = "NOTE"
        elif "rule" in file_path.lower():
            item_type = "RULE"

        filename = os.path.basename(file_path).replace(".json", "")
        if re.match(r'^\d+-\d+', filename):
            qid = filename
        else:
            qid = f"{topic.upper()}_{subtopic.upper()}_{filename.upper()}".replace("-", "_")

        return {
            "qid": qid,
            "subject": subject,
            "topic": topic,
            "subtopic": subtopic,
            "grade_level": 7,
            "item_type": item_type,
            "engine_type": engine_type,
            "question_text": data.get("topicTitle", data.get("topic", data.get("variantTitle", qid))),
            "interaction_config": repaired_data,
            "cdn_url": f"{CDN_BASE}{file_path}",
            "assets": list(set(repaired_assets))
        }
    except Exception as e:
        print(f"  [Skip] {e}")
        return None

def walk_tree(nodes, results):
    for node in nodes:
        node_type = node.get("type", "folder")
        if node_type == "file" and node.get("path", "").endswith(".json"):
            if "bank.json" in node["path"] or "atlas.json" in node["path"]: continue
            row = process_file(node["path"])
            if row: results.append(row)
        if "children" in node:
            walk_tree(node["children"], results)

if __name__ == "__main__":
    flat_list_file = "d:\\manya_app\\scripts\\excel_sync\\github_full_list.json"
    tree_file = "d:\\manya_app\\scripts\\excel_sync\\full_curriculum_tree.json"
    final_data = []
    
    if os.path.exists(flat_list_file):
        print(f"Loading exhaustive list from: {flat_list_file}")
        try:
            with open(flat_list_file, "r", encoding="utf-8-sig") as f:
                paths = json.load(f)
            for p in paths:
                if "bank.json" in p or "atlas.json" in p: continue
                row = process_file(p)
                if row: final_data.append(row)
        except Exception as e:
            print(f"Error reading flat list: {e}")
            exit()
    elif os.path.exists(tree_file):
        print(f"Loading tree from: {tree_file}")
        try:
            with open(tree_file, "r", encoding="utf-8-sig") as f:
                full_tree = json.load(f)
            walk_tree(full_tree, final_data)
        except Exception as e:
            print(f"Error reading tree file: {e}")
            exit()
    else:
        print("No source list found!")
        exit()

    print(f"\nFinal Push: {len(final_data)} components found.")
    for i in range(0, len(final_data), 50):
        batch = final_data[i:i+50]
        try:
            supabase.table("manya_vault").upsert(batch, on_conflict="subject,grade_level,qid").execute()
            print(f"Synced batch {i//50 + 1}/{(len(final_data)-1)//50 + 1} ({len(batch)} items)")
        except Exception as e:
            print(f"Error in batch {i//50 + 1}: {e}")

    print("\n--- OPERATION BOOM (100% COMPLETED) ---")
