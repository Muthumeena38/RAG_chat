import os
import io
import uuid
# pyrefly: ignore [missing-import]
import PyPDF2
import docx
from collections import deque
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
if "GROQ_API_KEY" in os.environ:
    groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
else:
    groq_client = None

# Initialize SentenceTransformer
print("Loading sentence transformer model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded.")

# Initialize ChromaDB (Persistent)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection_name = "docmind_collection"
try:
    collection = chroma_client.get_or_create_collection(name=collection_name)
except Exception as e:
    print(f"Error accessing collection: {e}")
    # Fallback to creating a new one if it fails (can happen due to schema changes)
    chroma_client.delete_collection(name=collection_name)
    collection = chroma_client.create_collection(name=collection_name)

def parse_txt(content: bytes) -> str:
    return content.decode("utf-8", errors="ignore")

def parse_pdf(content: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(content))
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text

def parse_docx(content: bytes) -> str:
    doc = docx.Document(io.BytesIO(content))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

def parse_file(content: bytes, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.pdf':
        return parse_pdf(content)
    elif ext == '.docx':
        return parse_docx(content)
    elif ext == '.txt':
        return parse_txt(content)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    words = text.split()
    chunks = []
    if not words:
        return chunks
    
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk = " ".join(chunk_words)
        
        # apply minimum chunk length requirement
        if len(chunk) >= 30:
            chunks.append(chunk)
            
        i += (chunk_size - overlap)
    
    return chunks

def index_document(content: bytes, filename: str):
    # Parse
    text = parse_file(content, filename)
    if not text.strip():
        raise ValueError("Document appears to be empty or unreadable.")
        
    # Chunk
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No valid chunks generated from the document.")

    # Generate Embeddings & Store
    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]
    
    # SentenceTransformer allows encoding directly to lists of floats
    embeddings = embedding_model.encode(chunks).tolist()
    
    collection.add(
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )
    return len(chunks)

def query_rag(question: str) -> str:
    if not groq_client:
        return "Error: GROQ_API_KEY is not set in the environment variables."
        
    if collection.count() == 0:
        return "No documents have been indexed yet. Please upload a document first."

    # 1. Embed query
    query_embedding = embedding_model.encode([question]).tolist()[0]
    
    # 2. Retrieve top-5 from Chroma
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(5, collection.count())
    )
    
    retrieved_chunks = results['documents'][0]
    sources = results['metadatas'][0]
    
    context_text = ""
    for i, chunk in enumerate(retrieved_chunks):
        source = sources[i].get("source", "Unknown")
        context_text += f"\n[Source: {source}]\n{chunk}\n"
        
    # 3. Call Groq
    prompt = f"""You are DocMind, an intelligent document Q&A assistant.
You must answer the user's question based strictly on the provided context.
If the answer cannot be found in the context, reply exactly with: "Not found."
If you find the answer, please cite the source name from the context at the end of your answer.

Context:
{context_text}

Question: {question}
"""
    
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="llama-3.1-8b-instant",
    )
    
    return chat_completion.choices[0].message.content

def clear_data():
    global collection
    # We clear the collection by creating a new ephemeral or deleting from the persistent one
    try:
        # Delete the collection from db
        chroma_client.delete_collection(name=collection_name)
    except Exception:
        pass
    # Recreate it empty
    collection = chroma_client.create_collection(name=collection_name)

def get_stats():
    count = collection.count()
    return {
        "documents_loaded": count > 0,
        "chunk_count": count
    }
