# Installation Guide

This guide provides detailed steps for installing and setting up Gemini CLI on your system.

## System Requirements

- **Node.js**: v14.0.0 or later
- **Python**: v3.8 or later
- **Google Gemini API Key**: You'll need to sign up for the Google AI Studio to get an API key

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/RRocaP/gemini-cli.git
cd gemini-cli
```

### 2. Install Dependencies

We've provided a convenient script to install all dependencies at once:

```bash
npm run install-all
```

This will install both Node.js and Python dependencies. Alternatively, you can install them separately:

**For Node.js dependencies:**
```bash
npm install
```

**For Python dependencies:**
```bash
cd proxy
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

1. Create a `.env` file by copying the example:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your favorite text editor:
   ```bash
   nano .env
   ```

3. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

4. Optional: Configure other settings like the default model or proxy URL.

### 4. Make the CLI Executable (Optional)

If you want to run gemini-cli as a global command:

```bash
npm install -g .
```

## Troubleshooting

### API Key Issues

If you see an error about the API key not being initialized:
1. Make sure your `.env` file is in the root directory of the project
2. Check that the `GEMINI_API_KEY` is correctly set and not surrounded by quotes
3. Verify that your API key is valid by testing it in the Google AI Studio

### Connection Issues

If you're unable to connect to the proxy server:
1. Ensure the proxy server is running with `npm run start-proxy`
2. Check that the port 8000 is not being used by another application
3. Verify that there's no firewall blocking the connection

### Model Availability

Not all Gemini models may be available to your API key. If you encounter an error about model availability:
1. Try using a different model with `--model gemini-pro`
2. Check your Google AI Studio dashboard to see which models are available to you

## Running as a Service (Advanced)

For users who want to run the proxy server as a background service:

### Using PM2 (Node.js process manager)

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Create a startup script:
   ```bash
   # Create a file named start-gemini-proxy.js
   const { spawn } = require('child_process');
   const path = require('path');

   const cwd = process.cwd();
   const proxy = spawn('npm', ['run', 'start-proxy'], { cwd });

   proxy.stdout.on('data', (data) => {
     console.log(`stdout: ${data}`);
   });

   proxy.stderr.on('data', (data) => {
     console.error(`stderr: ${data}`);
   });
   ```

3. Start with PM2:
   ```bash
   pm2 start start-gemini-proxy.js --name "gemini-proxy"
   pm2 save
   pm2 startup
   ```