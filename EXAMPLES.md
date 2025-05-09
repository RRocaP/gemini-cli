# Gemini CLI Usage Examples

This document provides practical examples of using Gemini CLI in different scenarios.

## Basic Commands

### Getting Help

```bash
npm start -- --help
```

Output:
```
Options:
  -m, --model        Gemini model to use (gemini-pro, gemini-pro-vision,
                     gemini-flash, gemini-2.5-pro-preview-05-06)
                                       [string] [default: "gemini-2.5-pro-preview-05-06"]
  -t, --temperature  Temperature for response generation [number] [default: 0.7]
  -s, --stream       Enable streaming responses         [boolean] [default: true]
  -f, --file         Process a file or directory                         [string]
  -h, --help         Show help                                         [boolean]
  -v, --version      Show version number                               [boolean]
```

### Basic Conversation

Simply start the CLI and type your questions:

```bash
npm start

gemini> What is the capital of France?
```

The model will respond with information about Paris.

### Using Different Models

```bash
npm start -- --model gemini-pro

gemini> Explain quantum computing in simple terms.
```

### Adjusting Temperature

For more creative responses:

```bash
npm start -- --temperature 0.9

gemini> Write a short poem about technology.
```

For more deterministic responses:

```bash
npm start -- --temperature 0.1

gemini> List the steps to troubleshoot a network connection.
```

## File Operations

### Reading and Analyzing Files

You can use the CLI to analyze files directly:

```bash
npm start -- --file /path/to/your/code.js
```

### Using File Tools in Conversation

Within a conversation, you can use file tools:

```bash
npm start

gemini> Read the contents of my package.json file
```

The CLI will use the read_file tool to display the contents.

```bash
gemini> Help me understand what this code does: [paste code here]
```

The model will analyze the code and explain it.

### Editing Files

You can ask Gemini CLI to edit files for you:

```bash
gemini> Update my README.md to include information about the new feature
```

The CLI will use the edit_file tool to make the requested changes.

## Code Search

Finding specific patterns in your codebase:

```bash
gemini> Find all functions that use async/await in my src directory
```

The CLI will use the search_code tool to find matching patterns.

## Directory Analysis

Analyzing project structure:

```bash
gemini> Analyze the structure of my project and suggest improvements
```

Gemini will use the list_directory tool to understand the project structure.

## Command Execution

Running commands from within the CLI:

```bash
gemini> Run npm test and tell me if there are any failures
```

The CLI will use the execute_command tool to run the tests and report results.

## Complex Workflows

### Code Review

```bash
gemini> Review my JavaScript code in src/app.js and suggest improvements
```

The CLI will read the file, analyze it, and provide suggestions.

### Debugging Help

```bash
gemini> I'm getting this error when running my app: [paste error]. Help me debug it.
```

Gemini will help identify the problem and suggest solutions.

### Project Setup

```bash
gemini> Help me set up a new React project with TypeScript and ESLint
```

The CLI will provide step-by-step instructions and might even help execute setup commands.

## Tips for Effective Usage

1. **Be Specific**: The more specific your request, the better the response.
2. **Use Context**: Provide relevant context for your questions.
3. **Combine Tools**: Many tasks require multiple tools - Gemini CLI can chain them together.
4. **Iterative Approach**: For complex tasks, break them down and work through them step by step.
5. **Manage Conversations**: Remember that the CLI maintains conversation history, so you can refer back to previous exchanges.