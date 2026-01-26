
import os
import re
from datetime import datetime

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    return text.strip('-')

def parse_turkish_date(date_str):
    # Example: "07 Haziran 2025" or "07 Haziran 2025 Cumartesi"
    month_map = {
        'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04', 'Mayıs': '05', 'Haziran': '06',
        'Temmuz': '07', 'Ağustos': '08', 'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12',
        'subat': '02', 'mayis': '05', 'haziran': '06', 'agustos': '08', 'eylul': '09', 'kasim': '11', 'aralik': '12' # Fallback for non-utf8
    }
    
    parts = date_str.strip().split()
    day = parts[0].zfill(2)
    month_name = parts[1]
    year = parts[2]
    
    # Handle possible encoding issues or simple transliteration
    normalized_month = month_name.replace('İ', 'I').replace('ı', 'i').replace('ş', 's').replace('Ş', 'S').replace('ç', 'c').replace('Ç', 'C').replace('ğ', 'g').replace('Ğ', 'G').replace('ü', 'u').replace('Ü', 'U').replace('ö', 'o').replace('Ö', 'O')
    
    # Try direct mapping first
    if month_name in month_map:
        month = month_map[month_name]
    else:
        # Try case-insensitive scan
        for k, v in month_map.items():
            if k.lower() == month_name.lower():
                month = v
                break
        else:
             # Fallback manual check for tough cases
             if 'haz' in month_name.lower(): month = '06'
             elif 'tem' in month_name.lower(): month = '07'
             elif 'agu' in month_name.lower(): month = '08' 
             elif 'eyl' in month_name.lower(): month = '09'
             elif 'eki' in month_name.lower(): month = '10'
             elif 'kas' in month_name.lower(): month = '11'
             elif 'ara' in month_name.lower(): month = '12'
             elif 'oca' in month_name.lower(): month = '01'
             elif 'sub' in month_name.lower(): month = '02'
             elif 'mar' in month_name.lower(): month = '03'
             elif 'nis' in month_name.lower(): month = '04'
             elif 'may' in month_name.lower(): month = '05'
             else:
                month = '01' # Default fallback
                print(f"Warning: Could not parse month '{month_name}', defaulting to 01")

    return f"{year}-{month}-{day}"

def extract_entries(html_content):
    # Split content by date-info to identify chunks
    # This regex looks for the date pattern.
    # Note: The HTML structure is repeated: date-info -> photo-container -> content
    
    # We will use a regex to find all blocks
    # Pattern: 
    # <div class="date-info">\s*(.*?)\s*</div>
    # ...?
    # <div class="photo-container">
    # ... <img src="(.*?)" ...>
    # ... <div class="photo-caption" ...>(.*?)</div>
    # ...
    # <div class="content" ...>(.*?)</div>
    
    # Since HTML is messy with regex, we'll try to split the string by a common delimiter
    # It seems every entry starts with <div class="date-info">
    
    parts = re.split(r'<div class="date-info">', html_content)
    
    entries = []
    
    for part in parts[1:]: # Skip the first part (header stuff)
        entry = {}
        
        # Extract Date
        # The split removed the opening tag, so the string starts with the date content + </div>
        date_match = re.search(r'\s*(.*?)\s*</div>', part, re.DOTALL)
        if date_match:
            raw_date = date_match.group(1).strip()
            # Remove any HTML tags from the date string
            raw_date = re.sub(r'<[^>]+>', '', raw_date).strip()
            # Clean up the date string (remove newlines, extra spaces)
            raw_date = re.sub(r'\s+', ' ', raw_date)
            
            # Validation: Must contain at least a year-like number (4 digits)
            if not re.search(r'\d{4}', raw_date):
                print(f"Skipping entry with invalid date: {raw_date}")
                continue
                
            entry['date'] = parse_turkish_date(raw_date)
            entry['title'] = raw_date # Fallback title
        else:
            print("Skipping entry with no date found")
            continue

        # Extract Image
        img_match = re.search(r'<img src="(.*?)"', part)
        if img_match:
            img_src = img_match.group(1)
            # Convert "img/foo.jpg" to "/gunluk_img/foo.jpg"
            entry['image'] = img_src.replace('img/', '/gunluk_img/')
        else:
            # Look for video if no image
            vid_match = re.search(r'<source src="(.*?)"', part)
            if vid_match:
                 entry['image'] = '' # Or handle video cover
            else: 
                 entry['image'] = ''

        # Extract Caption (Use as Title if possible)
        caption_match = re.search(r'<div class="photo-caption"[^>]*>(.*?)</div>', part, re.DOTALL)
        if caption_match:
            caption = caption_match.group(1).strip()
            # Clean tags if any
            caption = re.sub(r'<[^>]+>', '', caption).strip()
            if caption and caption not in ['---', '***']:
                entry['title'] = caption
            # If caption is empty or just dashes, we might look for h3 inside content

        # Extract Content
        content_match = re.search(r'<div class="content"[^>]*>(.*?)</div>\s*(?:<div class="date-info"|$)', part, re.DOTALL)
        # Note: The split method makes the 'part' go until the end of the string (which is the start of next date-info actually, due to split behavior).
        # But wait, split consumes the delimiter. So 'part' contains everything up to the next delimiter.
        # So we just need to find <div class="content"> block.
        # But wait, there might be other divs.
        # Let's verify the file ending.
        
        # A safer bet with regex on the 'part' string:
        # Find the content div. 
        # Since we split by date-info, 'part' contains:
        # [Date Date]</div> ... <photo-container>...</photo-container> ... <content>...</content> ... [Possible other tags] 
        
        # Let's find the content div explicitly
        # <div class="content" id="journal-content" contenteditable="false">
        c_start = part.find('class="content"')
        if c_start != -1:
            # Find the opening bracket just before
            start_tag_end = part.find('>', c_start)
            if start_tag_end != -1:
                # Naive content extraction: assume it ends just before the string end or some other marker?
                # Actually, the 'part' goes until the next date-info. 
                # Identifying the closing </div> for the content is hard with regex nesting.
                # However, in the file, content div seems to be the last main thing before the next date-info.
                # Let's take everything from > to the end?
                # No, there might be footer stuff in the very last entry.
                
                # Let's try to grab everything and strip closing divs?
                # Or just assume the content div isn't nested with other divs of the same class.
                # The content mostly contains <p> tags.
                
                content_body = part[start_tag_end+1:]
                
                # Cleanup: We need to remove the trailing stuff if any.
                # In the 'part', there might be closing tags of the container?
                # The HTML structure is flat in the body in terms of these blocks.
                # So the part likely ends with some whitespace or the closing of the previous block?
                # Wait, 'split' gives us:
                # [Content of entry 1] 
                # [Content of entry 2]
                
                # The content usually ends with </div>.
                # Let's try to find the last </div> in the part and assume it closes the content div?
                # This is risky. 
                
                # Alternative: Use the fact that content is followed by new lines or nothing.
                
                # Let's rely on the fact that we can clean up the end.
                # Remove the last </div> and maybe some other closing tags?
                content_body = re.sub(r'</div>\s*$', '', content_body.strip())
                
                # Also, sometimes the content has an </div> inside?
                # Let's assume the content is rich HTML.
                # We'll just take it as is for now, maybe strip the very last div close if it looks dangling.
                
                entry['content'] = content_body.strip()
                
                # Check for h3 title inside content if title is still weak
                h3_match = re.search(r'<h3>(.*?)</h3>', content_body)
                if h3_match and (len(entry['title']) < 5 or entry['title'] == entry['date']):
                    entry['title'] = h3_match.group(1).strip()
            
        entries.append(entry)
    
    return entries

def write_markdown_files(entries, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for entry in entries:
        date_str = entry.get('date', '2025-01-01')
        title = entry.get('title', 'Untitled')
        content = entry.get('content', '')
        image = entry.get('image', '')
        
        # Clean title for filename
        slug = slugify(title[:50]) if title else 'post'
        if not slug: slug = 'post'
        filename = f"{date_str}-{slug}.md"
        filepath = os.path.join(output_dir, filename)
        
        # Prepare frontmatter
        # Escape quotes in title
        safe_title = title.replace('"', '\\"')
        
        frontmatter = f"""---
title: "{safe_title}"
date: {date_str}T12:00:00+03:00
tags: ["Günlük"]
draft: false
cover:
    image: "{image}"
    relative: false
    caption: "{safe_title}"
---

{content}
"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(frontmatter)
        print(f"Created {filename}")

def main():
    input_file = r'C:\Users\kahra\OneDrive\Documents\GitHub\kahramankostas.github.io\gunluk\index.html'
    output_dir = r'C:\Users\kahra\OneDrive\Documents\GitHub\kahramankostas.github.io\blog\content\posts\gunluk'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    entries = extract_entries(html_content)
    print(f"Found {len(entries)} entries.")
    
    write_markdown_files(entries, output_dir)

if __name__ == '__main__':
    main()
