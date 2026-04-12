import os
import json
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def test_sync():
    test_path = 'content/science/musklo-skeletal-system/quest_1_types_of_skeletons/note_types_skeleton.json'
    raw_url = f'https://raw.githubusercontent.com/manyaug/manya-react-assets/main/{test_path}'
    
    try:
        response = requests.get(raw_url)
        data = response.json()
        
        row = {
            'qid': 'DEBUG_SCIENCE_001',
            'subject': 'SCIENCE',
            'topic': 'TEST',
            'subtopic': 'TEST',
            'grade_level': 7,  # Testing as integer
            'item_type': 'NOTE',
            'engine_type': 'NOTE',
            'question_text': 'test',
            'interaction_config': data,
            'cdn_url': 'test',
            'assets': []
        }
        
        print("Attempting to upsert Science row...")
        res = supabase.table('manya_vault').upsert(row, on_conflict='subject,grade_level,qid').execute()
        print("SUCCESS!")
        print(res)
        
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    test_sync()
