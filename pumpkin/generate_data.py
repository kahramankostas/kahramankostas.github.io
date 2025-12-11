import os
import json
import pandas as pd

EXCEL_FILE = 'bolumler.xlsx'
SRT_FOLDER = 'srts'
OUTPUT_JS = 'data.js'

def generate_data():
    print("Generating data.js...")
    
    # 1. Read Excel
    if os.path.exists(EXCEL_FILE):
        try:
            df = pd.read_excel(EXCEL_FILE)
            # Convert to list of dicts
            # Fill NaNs with empty string to avoid JSON errors
            excel_data = df.fillna('').to_dict(orient='records')
            print(f"Loaded {len(excel_data)} rows from Excel.")
        except Exception as e:
            print(f"Error reading Excel: {e}")
            excel_data = []
    else:
        print("Excel file not found.")
        excel_data = []

    # 2. Read SRTs
    srt_data = []
    if os.path.exists(SRT_FOLDER):
        files = [f for f in os.listdir(SRT_FOLDER) if f.lower().endswith('.srt')]
        for filename in files:
            filepath = os.path.join(SRT_FOLDER, filename)
            try:
                # Try UTF-8 first
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                try:
                    # Fallback
                    with open(filepath, 'r', encoding='latin-1') as f:
                        content = f.read()
                except:
                    print(f"Could not read {filename}")
                    continue
            
            srt_data.append({
                'filename': filename,
                'content': content
            })
        print(f"Loaded {len(srt_data)} SRT files.")
    else:
        print("SRT folder not found.")

    # 3. Write to JS
    # We write them as global const variables
    js_content = f"const DATA_EXCEL = {json.dumps(excel_data, ensure_ascii=False)};\n"
    js_content += f"const DATA_SRTS = {json.dumps(srt_data, ensure_ascii=False)};\n"

    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Successfully created {OUTPUT_JS}")

if __name__ == "__main__":
    generate_data()
