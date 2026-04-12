import pandas as pd
import json

def run_scalability_audit():
    path = "d:/manya_app/manya-react/public/content/main_bank/english-p7-question-bank.xlsx"
    sheet = "quests and grammar"
    df = pd.read_excel(path, sheet)
    
    report = []
    
    # 1. Row/ID Statistics
    total_rows = len(df)
    unique_qids = df['Q_ID'].dropna().nunique()
    if total_rows != unique_qids:
        duplicates = df[df.duplicated('Q_ID', keep=False)]['Q_ID'].tolist()
        report.append(f"[CRITICAL] Duplicate Q_IDs found: {len(duplicates)}")
        report.append(f"Sample Duplicates: {duplicates[:10]}")

    # 2. Critical Null Check
    null_topics = df[df['Topic'].isna()]['Q_ID'].tolist()
    if null_topics:
        report.append(f"[WARNING] Missing Topics for: {null_topics[:5]}")
        
    null_types = df[df['Question_Type'].isna()]['Q_ID'].tolist()
    if null_types:
        report.append(f"[WARNING] Missing Question_Type for: {null_types[:5]}")

    # 3. JSON Validity
    invalid_jsons = []
    for idx, row in df.iterrows():
        config = row.get('interaction_config')
        if pd.notna(config):
            try:
                if isinstance(config, str):
                    json.loads(config)
            except:
                invalid_jsons.append(row['Q_ID'])
    
    if invalid_jsons:
        report.append(f"[CRITICAL] Broken JSON (interaction_config) in: {len(invalid_jsons)} rows")
        report.append(f"Sample Broken IDs: {invalid_jsons[:10]}")

    # 4. Engine Consistency
    sims = df[df['Question_Type'] == 'SIMULATION']
    missing_engines = sims[sims['Engine_Type_sim'].isna()]['Q_ID'].tolist()
    if missing_engines:
        report.append(f"[WARNING] Simulation items missing Engine_Type_sim: {missing_engines[:5]}")

    # 5. Taxonomy Check
    # Ensure Sub-Topic follows quest_XX pattern for new items
    bad_taxonomy = df[~df['Sub-Topic'].astype(str).str.contains('quest_') & df['Q_ID'].astype(str).str.startswith('PQ-SIM')]['Q_ID'].tolist()
    if bad_taxonomy:
        report.append(f"[INFO] New simulations with non-standard subtopics: {len(bad_taxonomy)}")

    # Summary
    print("--- SCALABILITY AUDIT REPORT ---")
    if not report:
        print("PERFECT: No inconsistencies found.")
    else:
        for r in report: print(r)

if __name__ == "__main__":
    run_scalability_audit()
