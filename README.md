# Gemini CLI

A command-line interface for Google's Gemini API inspired by Claude Code.

![Gemini CLI](https://img.shields.io/badge/Gemini-CLI-blue)

## Features

- Interactive command-line interface for Google's Gemini API
- Support for different Gemini models (gemini-pro, gemini-pro-vision, gemini-flash, gemini-2.5-pro-preview-05-06)
- Streaming responses for real-time interaction
- Conversation history tracking
- File and directory analysis capabilities
- Easy API key configuration

## Prerequisites

- Node.js (v14 or later)
- Python (v3.8 or later)
- Google Gemini API key

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/RRocaP/gemini-cli.git
   cd gemini-cli
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Install Python dependencies:
   ```
   cd proxy
   pip install -r requirements.txt
   cd ..
   ```

4. Create your environment configuration file:
   ```
   cp .env.example .env
   ```

5. Edit the `.env` file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

## Usage

### Starting the Proxy Server

First, start the proxy server that communicates with the Gemini API:

```
npm run start-proxy
```

This will start a FastAPI server at http://localhost:8000.

### Starting the CLI

In a new terminal, start the Gemini CLI:

```
npm start
```

For more options:

```
npm start -- --help
```

### Command-line Arguments

- `--model, -m`: Select the Gemini model to use (default: gemini-2.5-pro-preview-05-06)
- `--temperature, -t`: Set the temperature for response generation (default: 0.7)
- `--stream, -s`: Enable/disable streaming responses (default: true)
- `--file, -f`: Process a file or directory

Example:

```
npm start -- --model gemini-2.5-pro-preview-05-06 --temperature 0.9 --file ./my-project
```

### Interactive Commands

Within the CLI, you can:

- Type your query and press Enter to get a response
- Type "exit" or press Ctrl+C to quit

## Adding Advanced Features

This implementation includes:

1. **File Tools**: Capabilities to read, write, and manipulate files from the CLI
2. **Search Tools**: Grep-like functionality for code search
3. **Project Analysis**: Basic project structure analysis
4. **Command Execution**: Run shell commands from within the CLI
5. **Tool Extension**: Easy to extend with more tools

Future enhancements could include:
1. **Visualizations**: Support for image processing and generation
2. **Package Management**: Support for installing and managing packages
3. **Plugin System**: Allow community plugins for extended functionality

## License

MIT

## Acknowledgments

- Inspired by Anthropic's Claude Code
- Powered by Google's Gemini API, featuring the latest models like gemini-2.5-pro-preview-05-06