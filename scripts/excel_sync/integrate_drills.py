import os
import json
import pandas as pd

def integrate():
    excel_path = r"d:\manya_app\manya-react\public\content\main_bank\english-p7-question-bank.xlsx"
    manifest_dir = r"d:\manya_app\manya-react\public\content\english"
    sheet_name = "quests and grammar"
    
    print(f"--- Integrating English Skill Drills ---")
    
    # 1. Load Manifests
    all_drills = []
    for i in range(1, 10):
        manifest_path = os.path.join(manifest_dir, f"manifest_subtopic_09.json".replace("09", f"{i:02d}"))
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                all_drills.extend(json.load(f))
    
    print(f"Loaded {len(all_drills)} drills from manifests.")
    
    # 2. Open Excel
    xl = pd.ExcelFile(excel_path)
    sheets = {name: xl.parse(name) for name in xl.sheet_names}
    df = sheets[sheet_name]
    
    # 3. Prepare New Rows
    new_rows = []
    existing_qids = set(df['Q_ID'].dropna().astype(str).tolist())
    
    for drill in all_drills:
        if drill['qid'] in existing_qids:
            print(f"Skipping existing QID: {drill['qid']}")
            continue
            
        new_row = {
            'Q_ID': drill['qid'],
            'Term': 'T1',
            'Topic': 'English Holidays – P7 (Uganda PLE)',
            'Sub-Topic': drill['subtopic'],
            'Difficulty': 'M',
            'Question_Type': 'SIMULATION',
            'Question_Text': f"Interactive Skill Drill: {drill['engine_type'].replace('_', ' ').title()}",
            'Detailed_Solution': "Follow the character's instructions to complete the drill!",
            'Engine_Type_sim': drill['engine_type'],
            'Mode_sim': 'DRILL',
            'Quest_ID': drill['subtopic'],
            'Characters': json.dumps([drill['data'].get('character', 'manya')]),
            'interaction_config': json.dumps(drill['data'])
        }
        new_rows.append(new_row)
    
    if not new_rows:
        print("No new rows to add.")
        return
        
    # 4. Append and Save
    df_new = pd.DataFrame(new_rows)
    df_updated = pd.concat([df, df_new], ignore_index=True)
    sheets[sheet_name] = df_updated
    
    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        for name, sheet_df in sheets.items():
            sheet_df.to_excel(writer, sheet_name=name, index=False)
            
    print(f"Successfully added {len(new_rows)} rows to '{sheet_name}'.")

if __name__ == "__main__":
    integrate()
