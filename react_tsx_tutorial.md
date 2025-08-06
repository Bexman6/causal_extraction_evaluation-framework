How to Run Your React Application

  Step 1: Open Terminal/Command Line

  - Windows: Press Win + R, type cmd, press Enter
  - Mac: Press Cmd + Space, type terminal, press Enter
  - Linux: Press Ctrl + Alt + T

  Step 2: Navigate to Your Project

  cd /home/alexander/Desktop/causal_extraction_eval_framework

  Step 3: Install Dependencies (First Time Only)

  npm install
  What this does: Downloads all the libraries your app needs
  (React, TypeScript, etc.)

  Step 4: Start Development Server

  npm run dev

  What happens:
  - Vite starts a development server
  - Your code gets compiled automatically
  - You'll see output like:
    VITE v5.2.0  ready in 500 ms

    ➜  Local:   http://localhost:5173/
    ➜  Network: use --host to expose

  Step 5: View Your Application

  1. Open your web browser (Chrome, Firefox, Safari, etc.)
  2. Go to: http://localhost:5173/
  3. You should see your Causal Extraction Evaluation Framework!


--------------------------------------------------

Development Commands:

  1. npm run dev - Start Development Server
  - What it does: Runs your app with hot reloading (changes
  appear instantly)
  - When to use: During development
  - Access: http://localhost:5173/

  2. npm run build - Build for Production
  - What it does: Creates optimized files for deployment
  - Output: Creates dist/ folder with compiled files
  - When to use: When ready to deploy to a website

  3. npm run preview - Preview Production Build
  - What it does: Serves the built files locally
  - When to use: Test your production build before deploying

  4. npm run lint - Check Code Quality
  - What it does: Finds code style issues and potential bugs
  - When to use: Before committing code

  ---
  🎯 Step-by-Step Beginner Workflow

  First Time Setup:

  # 1. Navigate to project
  cd /home/alexander/Desktop/causal_extraction_eval_framework

  # 2. Install dependencies (only needed once)
  npm install

  # 3. Start development server
  npm run dev

  Daily Development:

  # Start server (if not running)
  npm run dev

  # Make changes to your code files
  # Save files - changes appear automatically in browser!

  # Stop server when done (Ctrl+C in terminal)

  ---
  🌐 What You'll See in the Browser

  When you open http://localhost:5173/, you'll see:

  1. Header: "Causal Extraction Evaluation Framework"
  2. Tabs: Setup | Progress | Results | Database
  3. Setup Tab (default):
    - Task selection (Entity/Relationship extraction)
    - Dataset selection
    - Prompt selection with "Add Custom Prompt" button
    - Model selection checkboxes
    - Blue "Run Evaluation" button

  ---
  🛠️ Troubleshooting Common Issues

  Port Already in Use:

  # If port 5173 is busy, Vite will try 5174, 5175, etc.
  # Or manually specify a port:
  npm run dev -- --port 3000

  Changes Not Showing:

  - Hard refresh: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
  - Clear browser cache
  - Check terminal for errors

  Build Errors:

  # Check TypeScript errors
  npm run build

  # Fix any red error messages before running dev server

  ---
  🔄 Hot Reloading Magic

  The coolest part about npm run dev:
  - Save any file → Browser updates instantly
  - No manual refresh needed
  - Preserves your app state (mostly)
  - Shows errors in browser if something breaks