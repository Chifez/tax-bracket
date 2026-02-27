import requests

url = "http://localhost:8000/parse"
files = {'file': ('gtbank_statement.pdf', open('../../public/gtbank_statement.pdf', 'rb'), 'application/pdf')}

try:
    response = requests.post(url, files=files)
    print("Status code:", response.status_code)
    data = response.json()
    print("Extracted text length:", len(data.get("rawText", "")))
    print("Structured rows count:", len(data.get("rows", [])))
    print("Preview of first row:", data.get("rows", [])[0] if data.get("rows") else "None")
    
    with open("response.json", "w", encoding="utf-8") as f:
        f.write(response.text)
    print("Saved raw output to response.json")
except Exception as e:
    print(e)
