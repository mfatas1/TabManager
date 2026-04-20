# TabManager

A simple link manager with tag extraction and visualization.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
   - Create a `.env` file in the project root with:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/tabmanager
   OPENAI_API_KEY=your-openai-api-key-here
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```
   - Get your OpenAI API key from: https://platform.openai.com/api-keys
   - Create a database named `tabmanager` (or your preferred name)

   - Create a `frontend/.env` file with:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_URL=http://localhost:8000
   ```

3. Run the application:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000
