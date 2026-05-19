from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import rag_engine

app = FastAPI(title="DocMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 25 * 1024 * 1024 # 25 MB

class QuestionRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # Check file size by reading
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 25 MB.")
    
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
        
    try:
        chunks_indexed = rag_engine.index_document(contents, file.filename)
        return {"message": "Document indexed successfully.", "chunks": chunks_indexed, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error indexing document: {str(e)}")

@app.post("/ask")
async def ask_question(req: QuestionRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    try:
        answer = rag_engine.query_rag(req.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.delete("/clear")
async def clear_documents():
    try:
        rag_engine.clear_data()
        return {"message": "All documents cleared successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing documents: {str(e)}")

@app.get("/status")
async def get_status():
    try:
        stats = rag_engine.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")
