from fastapi import FastAPI, File, UploadFile, HTTPException
import pdfplumber
import io
import tempfile
import pytesseract
from pdf2image import convert_from_bytes

app = FastAPI(title="PDF Spatial Parser Microservice")

@app.post("/parse")
async def parse_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        content = await file.read()
        pdf_buffer = io.BytesIO(content)
        
        raw_text = ""
        structured_rows = []
        headers = []
        
        with pdfplumber.open(pdf_buffer) as pdf:
            for page in pdf.pages:
                # 1. Extract raw text with layout preserved
                page_text = page.extract_text(x_tolerance=2, y_tolerance=3, layout=True)
                if page_text:
                    raw_text += page_text + "\n"
        
        # If no text was found by pdfplumber, this is likely an image-based PDF or has encoding issues.
        # Fallback to OCR using Tesseract
        if not raw_text.strip():
            print("[INFO] No text found. Falling back to OCR...")
            images = convert_from_bytes(content)
            for img in images:
                ocr_text = pytesseract.image_to_string(img)
                raw_text += ocr_text + "\n"

        # (Simplified structural mapping for demo after OCR)
        lines = raw_text.split('\n')
        for line in lines:
             parts = [p.strip() for p in line.split('  ') if p.strip()]
             if len(parts) >= 3 and not headers:
                 headers = [h.lower() for h in parts]
                 continue
             if headers and len(parts) >= 3:
                 row_dict = {}
                 for h_idx, header in enumerate(headers):
                     row_dict[header] = parts[h_idx] if h_idx < len(parts) else ""
                 structured_rows.append(row_dict)
                    
        return {
            "rawText": raw_text,
            "rows": structured_rows,
            "headers": headers,
            "format": "pdf"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "ok"}
