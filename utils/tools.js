/**
 * Gemini CLI Tools
 * 
 * This module provides tools functionality similar to Claude Code,
 * allowing the CLI to perform operations like file manipulation,
 * code search, and more.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');
const glob = require('glob');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const globAsync = promisify(glob);

/**
 * Available tools that can be used by the Gemini API
 */
const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to read"
          },
          offset: {
            type: "integer",
            description: "Line number to start reading from (optional)"
          },
          limit: {
            type: "integer",
            description: "Maximum number of lines to read (optional)"
          }
        },
        required: ["file_path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to write"
          },
          content: {
            type: "string",
            description: "The content to write to the file"
          }
        },
        required: ["file_path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Edit a file by replacing text",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to edit"
          },
          old_string: {
            type: "string",
            description: "The text to replace"
          },
          new_string: {
            type: "string",
            description: "The new text to insert"
          }
        },
        required: ["file_path", "old_string", "new_string"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List files and directories in a specified path",
      parameters: {
        type: "object",
        properties: {
          directory_path: {
            type: "string",
            description: "The path to the directory to list"
          },
          pattern: {
            type: "string",
            description: "File glob pattern to filter results (optional)"
          }
        },
        required: ["directory_path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description: "Search for a pattern in files",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string", 
            description: "The regex pattern to search for"
          },
          path: {
            type: "string",
            description: "The directory to search in (defaults to current directory)"
          },
          file_pattern: {
            type: "string",
            description: "File glob pattern to include (e.g., '*.js', '*.{ts,tsx}')"
          }
        },
        required: ["pattern"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_command",
      description: "Execute a shell command",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The command to execute"
          },
          timeout: {
            type: "integer",
            description: "Timeout in milliseconds (optional)"
          }
        },
        required: ["command"]
      }
    }
  }
];

/**
 * Implementation of the tools
 */
const toolImplementations = {
  // Read a file
  read_file: async ({ file_path, offset = 0, limit = 2000 }) => {
    try {
      const absolutePath = path.resolve(file_path);
      
      if (!fs.existsSync(absolutePath)) {
        return { error: `File not found: ${file_path}` };
      }
      
      const content = await readFileAsync(absolutePath, 'utf8');
      const lines = content.split('\n');
      
      // Apply offset and limit if needed
      const selectedLines = lines.slice(offset, offset + limit);
      const result = selectedLines.join('\n');
      
      // Add line numbers (cat -n style)
      const numberedLines = selectedLines.map((line, i) => 
        `${(i + offset + 1).toString().padStart(6)}  ${line}`
      ).join('\n');
      
      return { 
        content: numberedLines,
        total_lines: lines.length,
        displayed_lines: selectedLines.length
      };
    } catch (error) {
      return { error: `Error reading file: ${error.message}` };
    }
  },
  
  // Write to a file
  write_file: async ({ file_path, content }) => {
    try {
      const absolutePath = path.resolve(file_path);
      const dirPath = path.dirname(absolutePath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      await writeFileAsync(absolutePath, content, 'utf8');
      return { success: true, message: `File written successfully: ${file_path}` };
    } catch (error) {
      return { error: `Error writing file: ${error.message}` };
    }
  },
  
  // Edit a file by replacing text
  edit_file: async ({ file_path, old_string, new_string }) => {
    try {
      const absolutePath = path.resolve(file_path);
      
      if (!fs.existsSync(absolutePath)) {
        return { error: `File not found: ${file_path}` };
      }
      
      const content = await readFileAsync(absolutePath, 'utf8');
      
      // Check if old_string exists in the file
      if (!content.includes(old_string)) {
        return { 
          error: `Text not found in file: ${old_string.substring(0, 50)}${old_string.length > 50 ? '...' : ''}` 
        };
      }
      
      // Replace the text
      const newContent = content.replace(old_string, new_string);
      await writeFileAsync(absolutePath, newContent, 'utf8');
      
      return { 
        success: true, 
        message: `File edited successfully: ${file_path}`,
        replacements: 1
      };
    } catch (error) {
      return { error: `Error editing file: ${error.message}` };
    }
  },
  
  // List files in a directory
  list_directory: async ({ directory_path, pattern }) => {
    try {
      const absolutePath = path.resolve(directory_path);
      
      if (!fs.existsSync(absolutePath)) {
        return { error: `Directory not found: ${directory_path}` };
      }
      
      if (!fs.statSync(absolutePath).isDirectory()) {
        return { error: `Path is not a directory: ${directory_path}` };
      }
      
      // If pattern is provided, use glob to find matching files
      if (pattern) {
        const matchingFiles = await globAsync(pattern, { 
          cwd: absolutePath, 
          dot: true 
        });
        
        return { 
          files: matchingFiles.map(file => ({
            name: file,
            type: fs.statSync(path.join(absolutePath, file)).isDirectory() ? 'directory' : 'file'
          })),
          directory: absolutePath
        };
      }
      
      // Otherwise, list all files in the directory
      const files = fs.readdirSync(absolutePath);
      return {
        files: files.map(file => {
          const filePath = path.join(absolutePath, file);
          return {
            name: file,
            type: fs.statSync(filePath).isDirectory() ? 'directory' : 'file'
          };
        }),
        directory: absolutePath
      };
    } catch (error) {
      return { error: `Error listing directory: ${error.message}` };
    }
  },
  
  // Search for patterns in files
  search_code: async ({ pattern, path: searchPath = '.', file_pattern }) => {
    try {
      const absolutePath = path.resolve(searchPath);
      
      if (!fs.existsSync(absolutePath)) {
        return { error: `Path not found: ${searchPath}` };
      }
      
      // Build the grep command
      let command = `grep -r "${pattern}" "${absolutePath}"`;
      
      // Add file pattern if provided
      if (file_pattern) {
        command += ` --include="${file_pattern}"`;
      }
      
      // Execute the command
      const result = execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 30000 // 30 seconds timeout
      });
      
      // Parse the results
      const matches = result.trim().split('\n').filter(line => line.trim() !== '');
      
      return {
        matches: matches.map(match => {
          const parts = match.split(':');
          const filePath = parts[0];
          const content = parts.slice(1).join(':');
          
          return {
            file: filePath,
            content
          };
        }),
        count: matches.length,
        pattern
      };
    } catch (error) {
      // Check if it's a "no matches found" error
      if (error.status === 1 && error.stderr === '') {
        return { matches: [], count: 0, pattern };
      }
      
      return { error: `Error searching code: ${error.message}` };
    }
  },
  
  // Execute a shell command
  execute_command: async ({ command, timeout = 60000 }) => {
    try {
      // List of forbidden commands for security
      const forbiddenCommands = [
        'rm -rf', 'sudo', 'chmod 777', 
        'mkfs', 'dd if=/dev/zero', 
        ':(){ :|:& };:'
      ];
      
      // Check for forbidden commands
      for (const forbidden of forbiddenCommands) {
        if (command.includes(forbidden)) {
          return {
            error: `Command not allowed for security reasons: ${command}`
          };
        }
      }
      
      const result = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout
      });
      
      return {
        output: result.trim(),
        command
      };
    } catch (error) {
      return {
        error: `Command execution failed: ${error.message}`,
        command
      };
    }
  }
};

/**
 * Process a function call based on tool name and parameters
 */
const processToolCall = async (toolCall) => {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  
  if (toolImplementations[name]) {
    try {
      return await toolImplementations[name](parsedArgs);
    } catch (error) {
      return { error: `Tool execution error: ${error.message}` };
    }
  } else {
    return { error: `Unknown tool: ${name}` };
  }
};

module.exports = {
  toolDefinitions,
  processToolCall
};