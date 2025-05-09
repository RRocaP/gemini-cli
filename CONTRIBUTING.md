# Contributing to Gemini CLI

Thank you for your interest in contributing to Gemini CLI! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

If you find a bug in the project:

1. Check if the bug has already been reported by searching the [Issues](https://github.com/RRocaP/gemini-cli/issues).
2. If not already reported, [open a new issue](https://github.com/RRocaP/gemini-cli/issues/new). Include a clear title, description, steps to reproduce, and any relevant information about your environment.

### Suggesting Enhancements

If you have ideas for enhancing the project:

1. Check if the enhancement has already been suggested by searching the [Issues](https://github.com/RRocaP/gemini-cli/issues).
2. If not already suggested, [open a new issue](https://github.com/RRocaP/gemini-cli/issues/new). Include a clear title, detailed description, and rationale for the enhancement.

### Pull Requests

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes, ensuring code quality and following the project's coding style.
4. Write tests for your changes, if applicable.
5. Ensure all tests pass.
6. Submit a pull request with a clear description of the changes and any relevant issue numbers.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/RRocaP/gemini-cli.git
   cd gemini-cli
   ```

2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Create and configure your environment:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to add your Gemini API key.

4. Start the development server:
   ```bash
   npm run start-proxy
   ```

5. In another terminal, run the CLI:
   ```bash
   npm start
   ```

## Adding New Tools

The Gemini CLI is designed to be extensible with new tools. To add a new tool:

1. Open the `utils/tools.js` file.
2. Add your tool definition to the `toolDefinitions` array:
   ```javascript
   {
     type: "function",
     function: {
       name: "your_tool_name",
       description: "Description of what your tool does",
       parameters: {
         type: "object",
         properties: {
           // Define your tool parameters here
         },
         required: ["param1", "param2"]
       }
     }
   }
   ```

3. Implement your tool in the `toolImplementations` object:
   ```javascript
   your_tool_name: async ({ param1, param2 }) => {
     // Implement your tool functionality here
     return { result: "Your tool result" };
   }
   ```

4. Test your tool thoroughly.

## Code Style Guidelines

- Follow the existing code style in the project.
- Use meaningful variable and function names.
- Write clear comments for complex logic.
- Use ES6+ features where appropriate.
- Format your code using the project's linting rules.

## Testing

Ensure that your changes don't break existing functionality. Test your changes thoroughly before submitting a pull request.

## Documentation

Update the documentation to reflect any changes you make:

- Update the README.md if your changes affect the general usage.
- Add or update inline comments for any code changes.
- Update or add documentation files for new features.

## License

By contributing to Gemini CLI, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).