# 🧠 DocMind | AI-Powered RAG Application

A full-stack Retrieval-Augmented Generation (RAG) web application that allows users to upload documents and query their contents using natural language. 

Built with a high-performance FastAPI backend and a responsive, modern React/Vite frontend.

## 🌟 Features
- **Document Parsing:** Upload and extract text from `.pdf`, `.docx`, and `.txt` files.
- **Semantic Search:** Uses local Sentence-Transformers to generate vector embeddings for intelligent context retrieval.
- **Fast LLM Inference:** Integrated with the Groq API (LLaMA 3.1) for lightning-fast, highly accurate answers grounded strictly in the uploaded documents.
- **Modern UI:** Built with React and Vite, featuring a premium dark-mode aesthetic with smooth micro-animations.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Vanilla CSS
- **Backend:** Python, FastAPI, Uvicorn, Pydantic
- **Vector Database:** ChromaDB (Persistent local storage)
- **AI & ML:** Groq API (LLaMA 3.1 8B), Hugging Face `sentence-transformers`

## 🚀 Running Locally

### Prerequisites
- Python 3.10+
- Node.js & npm

### 1. Setup the Backend
Navigate to the backend directory:
```bash
cd backend
```
Create a virtual environment and install dependencies:
```bash
python -m venv venv
# On Windows
.\venv\Scripts\activate
# On Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```
Set up your environment variables:
- Rename `.env.example` to `.env`
- Add your Groq API key: `GROQ_API_KEY=your_real_key_here`

Start the backend server:
```bash
uvicorn main:app --reload
```

### 2. Setup the Frontend
Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```
Install the node modules and start the development server:
```bash
npm install
npm run dev
```

## 🌐 Live Deployment
- **Backend:** Hosted on [Render](https://rag-chat-bd0f.onrender.com)
- **Frontend:** Hosted on Vercel *(Add your Vercel link here!)*
