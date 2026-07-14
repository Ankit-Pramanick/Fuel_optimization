import re

with open(r"C:\Users\ANKIT PRAMANICK\.gemini\antigravity-ide\brain\29d8c85f-4caa-4eb3-9008-3abd8f8ff0f7\.system_generated\steps\162\content.md", "r", encoding="utf-8") as f:
    html = f.read()

# Look for commits or files on the page
print("Staged commits / commit titles / usernames:")
# Find commit message links or titles
msgs = re.findall(r'href="/Ankit-Pramanick/Fuel_optimization/commit/([a-f0-9]+)"[^>]*>\s*([^<]+)', html)
print("Commits found in page:", msgs)

# Check if README.md file is in the file list table
has_readme_file = "README.md" in html
print("README.md file listed on page?", has_readme_file)
