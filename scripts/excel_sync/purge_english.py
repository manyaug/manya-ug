import os
from supabase import create_client
from dotenv import load_dotenv

def purge_english():
    # 1. Load Credentials
    load_dotenv(r"d:\manya_app\scripts\excel_sync\.env")
    s_url = os.getenv("SUPABASE_URL")
    s_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not s_url or not s_key:
        print("Error: Supabase credentials missing!")
        return
        
    supabase = create_client(s_url, s_key)
    
    print("--- ENGLISH PURGE INITIATED ---")
    
    # 2. Get Count for confirmation
    count_res = supabase.table('manya_vault').select('id', count='exact').eq('subject', 'ENGLISH').execute()
    total_to_delete = count_res.count
    print(f"Target: {total_to_delete} English records identified for deletion.")
    
    if total_to_delete == 0:
        print("Nothing to delete. English is already clean.")
        return

    # 3. Perform Deletion
    # Note: Service Role Key is required for bulk deletion without row-level restriction
    res = supabase.table('manya_vault').delete().eq('subject', 'ENGLISH').execute()
    
    if res.data or len(res.data) == 0:
        print(f"SUCCESS: All English records have been purged from the Vault.")
        
    # 4. Final Verification
    final_res = supabase.table('manya_vault').select('id', count='exact').eq('subject', 'ENGLISH').execute()
    print(f"Post-Purge Verification: {final_res.count} English records remaining.")

if __name__ == "__main__":
    purge_english()
