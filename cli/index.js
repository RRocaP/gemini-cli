#!/usr/bin/env node

/**
 * Gemini CLI - A command-line interface for Google's Gemini API
 * Inspired by Claude Code but using Gemini models
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const fetch = require('node-fetch');
const chalk = require('chalk');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const dotenv = require('dotenv');

// Import tools module
const { toolDefinitions, processToolCall } = require('../utils/tools');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configure proxy URL
const PROXY_URL = process.env.PROXY_URL || 'http://localhost:8000';

// Configure CLI options
const argv = yargs(hideBin(process.argv))
  .option('model', {
    alias: 'm',
    type: 'string',
    description: 'Gemini model to use (gemini-pro, gemini-pro-vision, gemini-flash, gemini-2.5-pro-preview-05-06)',
    default: 'gemini-2.5-pro-preview-05-06'
  })
  .option('temperature', {
    alias: 't',
    type: 'number',
    description: 'Temperature for response generation',
    default: 0.7
  })
  .option('stream', {
    alias: 's',
    type: 'boolean',
    description: 'Enable streaming responses',
    default: true
  })
  .option('file', {
    alias: 'f',
    type: 'string',
    description: 'Process a file or directory'
  })
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .alias('version', 'v')
  .argv;

// ASCII art logo
const displayLogo = () => {
  console.log(chalk.blue(`
  ┏━━━┓━━━━━━━━━━━━━━━━━┏┓━━━━━
  ┃┏━┓┃━━━━━━━━━━━━━━━━━┃┃━━━━━
  ┃┃━┗┛┏━━┓┏┓┏┓┏┓┏━┓┏┓┏━┛┃━━━━━
  ┃┃┏━┓┃┏┓┃┃┗┛┃┣┫┃┏┛┣┫┃┏┓┃━━━━━
  ┃┗┻━┃┃┗┛┃┃┃┃┃┃┃┃┃━┃┃┃┗┛┃━━━━━
  ┗━━━┛┗━━┛┗┻┻┛┗┛┗━┛┗┛┗━━┛━━━━━
  CLI - Powered by Google Gemini API
  `));
};

// Create the readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.green('gemini> ')
});

// Function to make API requests to the proxy server
const callGeminiAPI = async (messages, options = {}) => {
  const defaultOptions = {
    model: argv.model,
    temperature: argv.temperature,
    stream: argv.stream,
    max_tokens: 4096,
    tools: toolDefinitions,
    tool_choice: "auto"
  };

  const requestOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(`${PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: requestOptions.model,
        messages: messages,
        temperature: requestOptions.temperature,
        stream: requestOptions.stream,
        max_tokens: requestOptions.max_tokens,
        tools: requestOptions.tools,
        tool_choice: requestOptions.tool_choice
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.detail || response.statusText}`);
    }

    // Handle streaming response
    if (requestOptions.stream) {
      if (!response.body) {
        throw new Error('No response body received for streaming');
      }

      let fullContent = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const decodedChunk = decoder.decode(value, { stream: true });
          const lines = decodedChunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              
              if (data === '[DONE]') {
                continue;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0].delta.content) {
                  const content = parsed.choices[0].delta.content;
                  process.stdout.write(content);
                  fullContent += content;
                }
              } catch (e) {
                // Skip non-JSON data
              }
            }
          }
        }
      }
      
      console.log('\n');
      return fullContent;
    } else {
      // Handle non-streaming response
      const data = await response.json();

      // Check if there's a function call in the response
      if (data.choices &&
          data.choices[0].message &&
          data.choices[0].message.function_call) {

        const functionCall = data.choices[0].message.function_call;
        console.log(chalk.blue(`Function call: ${functionCall.name}`));

        // Process the function call
        const toolResult = await processToolCall({
          function: {
            name: functionCall.name,
            arguments: functionCall.arguments
          }
        });

        // Log the tool result
        console.log(chalk.cyan('Tool result:'));
        console.log(JSON.stringify(toolResult, null, 2));

        // Add the tool result to the messages
        messages.push({
          role: 'assistant',
          content: data.choices[0].message.content,
          function_call: functionCall
        });

        // Add the function result to messages
        messages.push({
          role: 'function',
          name: functionCall.name,
          content: JSON.stringify(toolResult)
        });

        // Call the API again with the tool result
        return await callGeminiAPI(messages, {...options, stream: false});
      }

      // Regular text response
      const content = data.choices[0].message.content;
      console.log(content);
      return content;
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    return null;
  }
};

// Start the CLI
const startCLI = async () => {
  displayLogo();
  
  console.log(chalk.yellow(`Using model: ${argv.model}`));
  console.log(chalk.yellow(`Streaming: ${argv.stream ? 'enabled' : 'disabled'}`));
  console.log(chalk.yellow('Type "exit" or press Ctrl+C to quit\n'));
  
  // Check if the proxy server is running
  try {
    const healthCheck = await fetch(`${PROXY_URL}/health`);
    const healthData = await healthCheck.json();
    
    if (!healthData.api_initialized) {
      console.error(chalk.red('Warning: Gemini API not properly initialized at the proxy server.'));
      console.error(chalk.red('Please check that GEMINI_API_KEY is set in the .env file.'));
    }
  } catch (error) {
    console.error(chalk.red(`Error: Cannot connect to proxy server at ${PROXY_URL}`));
    console.error(chalk.red('Please start the proxy server first with: npm run start-proxy'));
    process.exit(1);
  }
  
  // Process a file if provided
  if (argv.file) {
    const filePath = path.resolve(argv.file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(chalk.yellow(`Processing file: ${filePath}`));
        await callGeminiAPI([
          { role: 'user', content: `I'm providing this file content for analysis: ${filePath}\n\n${content}` }
        ]);
      } else if (stats.isDirectory()) {
        console.log(chalk.yellow(`Processing directory: ${filePath}`));
        // Get a list of files in the directory
        let fileList = '';
        const files = fs.readdirSync(filePath);
        for (const file of files) {
          const fullPath = path.join(filePath, file);
          const fileStats = fs.statSync(fullPath);
          fileList += `${file} (${fileStats.isDirectory() ? 'directory' : 'file'})\n`;
        }
        
        await callGeminiAPI([
          { role: 'user', content: `I'm providing this directory structure for analysis: ${filePath}\n\n${fileList}` }
        ]);
      }
      process.exit(0);
    } else {
      console.error(chalk.red(`Error: File or directory not found: ${filePath}`));
      process.exit(1);
    }
  }
  
  // Start conversation loop
  const conversationHistory = [];
  rl.prompt();
  
  rl.on('line', async (line) => {
    const userInput = line.trim();
    
    if (userInput.toLowerCase() === 'exit') {
      console.log(chalk.yellow('Goodbye!'));
      process.exit(0);
    }
    
    if (userInput) {
      // Add user message to conversation history
      conversationHistory.push({ role: 'user', content: userInput });
      
      // Call the API with the full conversation history
      const response = await callGeminiAPI(conversationHistory);
      
      if (response) {
        // Add assistant response to conversation history
        conversationHistory.push({ role: 'assistant', content: response });
      }
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log(chalk.yellow('\nGoodbye!'));
    process.exit(0);
  });
};

// Start the CLI
startCLI().catch(error => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
});