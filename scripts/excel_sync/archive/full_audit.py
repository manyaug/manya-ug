import os
import json
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def run_deep_audit():
    print("--- STARTING DEEP CURRICULUM AUDIT ---")
    
    # 1. Get ALL files from GitHub
    tree_url = "https://api.github.com/repos/manyaug/manya-react-assets/git/trees/main?recursive=1"
    print("Fetching GitHub structure...")
    r = requests.get(tree_url)
    tree = r.json().get("tree", [])
    
    github_json_files = [
        f["path"] for f in tree 
        if f["path"].startswith("content/") 
        and f["path"].endswith(".json")
        and "bank.json" not in f["path"]
        and "atlas.json" not in f["path"]
    ]
    print(f"Total JSON components on GitHub: {len(github_json_files)}")

    # 2. Get ALL records from DB (Paging)
    print("Fetching all database records (this may take a moment)...")
    db_qids = set()
    page_size = 1000
    start = 0
    while True:
        res = supabase.table("manya_vault").select("qid").range(start, start + page_size - 1).execute()
        if not res.data:
            break
        for row in res.data:
            db_qids.add(row["qid"])
        if len(res.data) < page_size:
            break
        start += page_size
    
    print(f"Total unique QIDs in Database: {len(db_qids)}")

    # 3. Reconcile
    missing_files = []
    for path in github_json_files:
        # Standard QID logic: topic_subtopic_filename or just filename for quests
        filename = os.path.basename(path).replace(".json", "")
        parts = path.split("/")
        topic = parts[2] if len(parts) > 2 else "GENERAL"
        subtopic = parts[3] if len(parts) > 3 else "QUEST_1"
        
        # Check both potential QID formats
        potential_qid_1 = filename # 04-015 format
        potential_qid_2 = f"{topic.upper()}_{subtopic.upper()}_{filename.upper()}".replace("-", "_")
        
        if potential_qid_1 not in db_qids and potential_qid_2 not in db_qids:
            missing_files.append(path)

    print(f"\nAudit Result: Found {len(missing_files)} missing files.")
    if missing_files:
        print("\n--- MISSING FILES LIST ---")
        for m in missing_files:
            print(f"MISSING: {m}")
    else:
        print("\n--- ALL FILES SYNCED 100% ---")

if __name__ == "__main__":
    run_deep_audit()
