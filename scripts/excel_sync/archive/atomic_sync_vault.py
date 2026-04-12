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

REPO_OWNER = "manyaug"
REPO_NAME = "manya-react-assets"
BRANCH = "main"
GITHUB_RAW_BASE = f"https://raw.githubusercontent.com/{REPO_OWNER}/{REPO_NAME}/{BRANCH}/"
CDN_BASE = f"https://cdn.jsdelivr.net/gh/{REPO_OWNER}/{REPO_NAME}@{BRANCH}/"

# Regex for common assets
ASSET_REGEX = re.compile(r'["\']([^"\']+\.(?:glb|png|jpg|jpeg|webp|svg|mp3|mp4))["\']')

def normalize_asset_url(match_path, current_file_path):
    """Deep repair logic for URLs within JSON files."""
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

def process_file_content(file_path):
    """Fetches raw content from GitHub and repairs it for the database."""
    raw_url = f"{GITHUB_RAW_BASE}{file_path}"
    try:
        response = requests.get(raw_url)
        if response.status_code != 200:
            return None
        
        data = response.json()
        parts = file_path.split("/")
        
        # Hierarchy: content/subject/topic/subtopic/file.json
        subject = parts[1].upper() if len(parts) > 1 else "UNKNOWN"
        topic = parts[2] if len(parts) > 2 else "GENERAL"
        subtopic = parts[3] if len(parts) > 3 else "QUEST_1"
        
        engine_type = data.get("engineType", data.get("mode", "SIMULATION")).upper()
        
        # Heal URLs
        raw_text = response.text
        found_assets = ASSET_REGEX.findall(raw_text)
        repaired_assets = [normalize_asset_url(a, file_path) for a in found_assets]
        
        def url_replacer(match):
            original = match.group(1)
            return f'"{normalize_asset_url(original, file_path)}"'
        
        repaired_json_text = ASSET_REGEX.sub(url_replacer, raw_text)
        repaired_data = json.loads(repaired_json_text)

        # Classify
        item_type = "SIMULATION"
        if "note" in file_path.lower() or "study" in file_path.lower():
            item_type = "NOTE"
        elif "rule" in file_path.lower():
            item_type = "RULE"
        elif "quiz" in file_path.lower():
            item_type = "SIMULATION"

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
            "grade_level": "7",
            "item_type": item_type,
            "engine_type": engine_type,
            "question_text": data.get("topicTitle", data.get("topic", data.get("variantTitle", qid))),
            "interaction_config": repaired_data,
            "cdn_url": f"{CDN_BASE}{file_path}",
            "assets": list(set(repaired_assets))
        }
    except Exception as e:
        print(f"  [Error processing {file_path}]: {e}")
        return None

def start_atomic_sync():
    print("--- STARTING ATOMIC SYNC ---")
    
    # 1. Get entire tree from GitHub
    tree_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/trees/{BRANCH}?recursive=1"
    print(f"Crawling repository: {REPO_NAME}...")
    try:
        r = requests.get(tree_url)
        if r.status_code != 200:
            print(f"Failed to fetch tree: {r.status_code}")
            return
        
        tree = r.json().get("tree", [])
        # Filter for content JSONs (skip banks and atlas)
        target_files = [
            f["path"] for f in tree 
            if f["path"].startswith("content/") 
            and f["path"].endswith(".json")
            and "bank.json" not in f["path"]
            and "atlas.json" not in f["path"]
        ]
        
        print(f"Discovered {len(target_files)} curriculum components.")
        
        final_data = []
        for i, file_path in enumerate(target_files):
            print(f"[{i+1}/{len(target_files)}] Processing {file_path}...")
            row = process_file_content(file_path)
            if row:
                final_data.append(row)
            
            # Batch Push every 50 or at the end
            if len(final_data) >= 50 or (i == len(target_files) - 1 and final_data):
                print(f"Pushing Batch ({len(final_data)} items)...")
                try:
                    supabase.table("manya_vault").upsert(
                        final_data, 
                        on_conflict="subject,grade_level,qid"
                    ).execute()
                    final_data = []
                except Exception as e:
                    print(f"  [Batch Push Error]: {e}")
                    final_data = [] # Reset to continue
                    
        print("\n--- OPERATION ATOMIC SYNC: 100% COMPLETE ---")
        
    except Exception as e:
        print(f"Critical sync failure: {e}")

if __name__ == "__main__":
    start_atomic_sync()
