import os
import pandas as pd

def run_validation():
    raw_results_path = "C:/Users/Admin/Desktop/Fifa prediction/datasets/raw/results.csv"
    processed_features_path = "C:/Users/Admin/Desktop/Fifa prediction/datasets/processed/engineered_features.csv"
    former_names_path = "C:/Users/Admin/Desktop/Fifa prediction/datasets/raw/former_names.csv"
    report_path = "C:/Users/Admin/.gemini/antigravity/brain/79c13f6b-c915-4137-a96f-2c33a3c21634/data_validation_report.md"

    # Load datasets
    df_raw = pd.read_csv(raw_results_path)
    df_proc = pd.read_csv(processed_features_path)
    df_former = pd.read_csv(former_names_path)

    # 1. Unique raw teams
    raw_teams = set(df_raw['home_team'].dropna().unique()).union(set(df_raw['away_team'].dropna().unique()))
    
    # 2. Unique processed teams
    proc_teams = set(df_proc['home_team'].dropna().unique()).union(set(df_proc['away_team'].dropna().unique()))

    # 3. Duplicate checks
    seen = {}
    duplicates = []
    for team in proc_teams:
        l_team = team.strip().lower()
        if l_team in seen:
            duplicates.append(f"{team} matches {seen[l_team]}")
        else:
            seen[l_team] = team
    
    # 4. Mapped teams details
    mappings = []
    for _, row in df_former.iterrows():
        mappings.append(f"- Mapped `{row['former']}` to `{row['current']}` (valid from {row['start_date']} to {row['end_date']})")

    # 5. Core validation checks (Argentina, Egypt, Brazil, France, Japan, Morocco, Nigeria, South Korea)
    core_teams = ["Argentina", "Egypt", "Brazil", "France", "Japan", "Morocco", "Nigeria", "South Korea"]
    present_core = [t for t in core_teams if t in proc_teams]
    missing_core = [t for t in core_teams if t not in proc_teams]

    # Generate Markdown Report
    report_content = f"""# Dataset Alignment & Integrity Validation Report

## 1. Summary Metrics
- **Total Teams in Raw Results**: {len(raw_teams)}
- **Total Teams in Processed Features**: {len(proc_teams)}
- **Missing Core Teams**: {missing_core if missing_core else 'None'}
- **Duplicate Teams Detected**: {len(duplicates)}

## 2. Former Teams Mapping Record
The following international former names were standardized using `former_names.csv` mapping rules:
{chr(10).join(mappings)}

## 3. Core Selector Verification
The following national teams requested for validation are mapped and present in the dataset selector:
"""
    for t in core_teams:
        status = "✅ Present" if t in proc_teams else "❌ Missing"
        report_content += f"- **{t}**: {status}\n"

    # Write to file
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    
    print("Validation report generated successfully!")

if __name__ == "__main__":
    run_validation()
