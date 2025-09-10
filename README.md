# Filesystem Link Manager

**Optimize your large codebase for GitHub Copilot indexing with intelligent file linking and workspace management.**

A VS Code extension that helps developers create efficient workspaces by linking files and directories from large codebases, specifically designed to work within GitHub Copilot's indexing thresholds for optimal AI assistance.

## Examples

![Filesystem Link Manager](./assets/filesystem-link-manager-example1.gif "Filesystem Link Manager")

## 🚀 Why Filesystem Link Manager?

### The Large Monorepo Challenge

When working with large monorepos (>750-2500 files), particularly those in TFS or other non-Git source control systems, you face several challenges:

- [**GitHub Copilot Indexing Limits**](https://code.visualstudio.com/docs/copilot/reference/workspace-context#_managing-the-workspace-index) (at the moment of writing): 
  - **< 750 files**: Advanced automatic local index
  - **750-2500 files**: Advanced local index (manual build required)
  - **> 2500 files**: Basic index with limited AI assistance

- **Monorepo Complexity**: Large monorepos often contain multiple services, packages, and shared libraries, making it difficult to focus on specific areas without loading the entire codebase.

- **Performance Issues**: Full monorepo loading can be extremely slow and resource-intensive, especially with thousands of files across multiple services.

- **TFS + Visual Studio 2022 Conflicts**: Visual Studio 2022 (at the time of writing) defaults to Git source control when a `.git` folder exists, even in TFS-mapped directories, making it difficult to create a local Git repository under TFS.

### The Solution

Filesystem Link Manager creates optimized workspaces by selectively linking files and directories from your large monorepo, allowing you to:

✅ **Stay within GitHub Copilot's optimal indexing range** (< 750 files for best AI assistance)
✅ **Utilize AI features while still working in the context of the monorepo** through symlinks/hardlinks connecting to the sources
✅ **Utilize existing build infrastructure of monorepo** you can still run command line utilities for build and linting in the monorepo while developing in the linked workspace. This is useful for local agentic development workflows.
✅ **Work with specific services/packages** from large monorepos without loading everything  
✅ **Initialize Git repositories** for modern tooling without source control conflicts  
✅ **Focus on code subsets** or specific domains within the monorepo  
✅ **Automate workspace setup** with post-execution commands

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Filesystem Link Manager"
4. Click "Install"

### From VSIX Package
1. Download the `.vsix` file
2. Open VS Code
3. Run command: `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file

## 🎯 Quick Start Tutorial

Let's create optimized workspaces for AI agentic development from a large C# enterprise monorepo. We'll show how to create service-focused workspaces that stay under GitHub Copilot's 750-file threshold while providing all necessary context for AI-assisted development of specific services.

### Before: Large Enterprise C# Monorepo Structure
```
C:\Monorepo\EnterpriseMonorepo\         (> 7000+ files)
├── Src\
│   ├── Core\
│   │   ├── Engine\               (250 files)
│   │   ├── Utilities\            (50 files)
│   │   ├── Models\               (120 files)
│   │   ├── Validation\           (80 files)
│   │   ├── Security\             (150 files)
│   │   └── ...                   (2500+ other files)
│   ├── Services\
│   │   ├── AuthenticationService\    (100 files)
│   │   ├── PaymentService\           (50 files)
│   │   ├── UserService\              (180 files)
│   │   ├── NotificationService\      (150 files)
│   │   ├── ApiGateway\               (200 files)
│   │   └── ...                       (1800+ other services)
│   ├── Shared\
│   │   ├── Contracts\            (80 files)
│   │   ├── Constants\            (40 files)
│   │   ├── Extensions\           (60 files)
│   │   ├── Infrastructure\       (200 files)
│   │   └── Middleware\           (100 files)
├── Tests\
│   ├── UnitTests\
│   │   ├── AuthenticationService.Tests\  (120 files)
│   │   ├── PaymentService.Tests\         (60 files)
│   │   ├── UserService.Tests\            (80 files)
│   │   └── ...                           (800+ other test files)
│   └── IntegrationTests\         (200+ files)
├── Packages\
│   ├── BusinessLogic\            (90 files)
│   ├── DataAccess\               (250 files)
│   ├── Logging\                  (60 files)
│   └── TestingUtilities\         (90 files)
├── Templates\                    (30 files)
│   ├── .gitignore
│   └── .github\
│       ├── copilot-instructions-authentication.md
│       ├── copilot-instructions-payment-service.md
│       └── workflows\
├── Docs\                         (150+ files)
├── Scripts\                      (80+ files)
└── Config\                       (120+ files)
```

### After: Optimized Workspace Structure - Workspace 1 (Authentication Service Focus)
```
C:\Workspaces\AuthenticationServiceWorkspace\  (< 750 files total)
├── .git\                                 (newly initialized)
├── .gitignore                            (copied from templates)
├── .github\                              (copied from templates)
│   ├── copilot-instructions.md
│   └── workflows\
├── .filesystem-link-manager
│   └── auth-attribute-adjustments.csv     (if you have any readonly file attributes which have been modified)
├── Src\
│   ├── Services\
│   │   └── AuthenticationService\        (symlinked directory - 100 files)
│   ├── Core\
│   │   ├── Security\                     (symlinked directory - 150 files)
│   ├── Shared\
│   │   └── Middleware\                   (symlinked directory - 100 files)
├── Tests\
│   └── UnitTests\
│       └── AuthenticationService.Tests\  (symlinked directory - 120 files)
├── ReferenceCode\                        (hardlinked .cs files)
│   ├── Core\
│   │   ├── Utilities\                    (hardlinked *.cs from Src/Core/Utilities)
│   │   └── Models\                       (hardlinked *.cs from Src/Core/Models)
│   └── Shared\
│       ├── Contracts\                    (hardlinked *.cs from Src/Shared/Contracts)
│       └── Extensions\                   (hardlinked *.cs from Src/Shared/Extensions)
├── Documentation\                        (hardlinked .md files)
│   └── *.md                              (authentication-related docs)
```

### After: Optimized Workspace Structure - Workspace 2 (Payment Service Focus)
```
C:\Workspaces\PaymentServiceWorkspace\  (< 750 files total)
├── .git\                                 (newly initialized)
├── .gitignore                            (copied from templates)
├── .github\                              (copied from templates)
│   ├── copilot-instructions.md
│   └── workflows\
├── .filesystem-link-manager
│   └── payment-attribute-adjustments.csv     (if you have any readonly file attributes which have been modified)
├── Src\
│   ├── Services\
│   │   └── PaymentService\               (symlinked directory - 50 files)
│   ├── Shared\
│   │   ├── Infrastructure\               (symlinked directory - 200 files)
│   │   └── Middleware\                   (symlinked directory - 100 files)
├── Tests\
│   └── UnitTests\
│       └── PaymentService.Tests\         (symlinked directory - 60 files)
├── ReferenceCode\                        (hardlinked .cs files)
│   ├── Core\
│   │   ├── Utilities\                    (hardlinked *.cs from Src/Core/Utilities)
│   │   └── Models\                       (hardlinked *.cs from Src/Core/Models)
│   ├── Shared\
│   │   └── Contracts\                    (hardlinked *.cs from Src/Shared/Contracts)
│   └── Packages\
│       └── BusinessLogic\                (hardlinked *.cs from Packages/BusinessLogic)
├── Documentation\                        (hardlinked .md files)
│   └── *.md                              (payment-related docs)
```

### Step 1: Create Configuration Files

Create a folder for your workspace configurations and add both files:

**Configuration 1: `linkmanager-config-authentication-service.json`** (Authentication Service Focus - ~720 files)

```json
{
    "targetDirectoryPath": "C:/Workspaces/AuthenticationServiceWorkspace",
    "silentMode": false,
    "enableSourceDeduplication": true,
    "defaultOverwriteBehavior": "overwrite",
    "fileCountPromptThreshold": 749,
    "operations": [
        {
            "action": "symlink",
            "itemType": "directory",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo",
            "searchPatterns": [
                {
                    "patternType": "path",
                    "pattern": [
                        "Src/Services/AuthenticationService",
                        "Src/Core/Security",
                        "Src/Shared/Middleware"
                    ]
                },
                {
                    "patternType": "glob",
                    "pattern": "Tests/UnitTests/Authentication*"
                }
            ],
            "fileAttributeAdjustment": {
                "readonly": "remove",
                "backupFilePath": ".filesystem-link-manager/auth-attribute-adjustments.csv"
            }
        },
        {
            "action": "hardlink",
            "itemType": "file",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Src",
            "searchPatterns": [
                {
                    "patternType": "glob",
                    "pattern": "Core/{Utilities,Models}/*.cs"
                },
                {
                    "patternType": "glob",
                    "pattern": "Shared/{Contracts,Extensions}/*.cs"
                }
            ],
            "destinationPath": "ReferenceCode"
        },
        {
            "action": "hardlink",
            "itemType": "file",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Docs",
            "searchPatterns": [
                {
                    "patternType": "glob",
                    "pattern": "*auth*.md"
                }
            ],
            "destinationPath": "Documentation"
        },
        {
            "action": "copy",
            "itemType": "file",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Templates",
            "searchPatterns": [
                {
                    "patternType": "path",
                    "pattern": ".gitignore"
                },
                {
                    "patternType": "path",
                    "pattern": ".github/copilot-instructions-authentication.md"
                }
            ]
        },
        {
            "action": "copy",
            "itemType": "directory",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Templates",
            "searchPatterns": [
                {
                    "patternType": "path",
                    "pattern": ".github/workflows"
                }
            ]
        }
    ],
    "postExecutionCommands": [
        {
            "command": "git init && git add . && git commit -m \"Authentication service workspace from monorepo\"",
            "skipIfPathExists": ".git"
        },
        {
            "command": "git mv \".github/copilot-instructions-authentication.md\" \".github/copilot-instructions.md\" && git commit -m \"Rename copilot-instructions-authentication.md to copilot-instructions.md\"",
            "skipIfPathExists": ".github/copilot-instructions.md"
        },
        {
            "command": "code C:/Workspaces/AuthenticationServiceWorkspace"
        }
    ]
}
```

**Configuration 2: `linkmanager-config-payment-service.json`** (Payment Service Focus - ~730 files)

```json
{
    "targetDirectoryPath": "C:/Workspaces/PaymentServiceWorkspace",
    "silentMode": false,
    "enableSourceDeduplication": true,
    "defaultOverwriteBehavior": "overwrite",
    "fileCountPromptThreshold": 749,
    "operations": [
        {
            "action": "symlink",
            "itemType": "directory",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo",
            "searchPatterns": [
                {
                    "patternType": "path",
                    "pattern": [
                        "Src/Services/PaymentService",
                        "Src/Shared/Infrastructure",
                        "Src/Shared/Middleware"
                    ]
                },
                {
                    "patternType": "glob",
                    "pattern": "Tests/UnitTests/PaymentService*"
                }
            ],
            "fileAttributeAdjustment": {
                "readonly": "remove",
                "backupFilePath": ".filesystem-link-manager/payment-utilities-file-adjustments.csv"
            }
        },
        {
            "action": "hardlink",
            "itemType": "file",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Src",
            "searchPatterns": [
                {
                    "patternType": "glob",
                    "pattern": "Core/{Utilities,Models}/*.cs"
                },
                {
                    "patternType": "glob",
                    "pattern": "Shared/Contracts/*.cs"
                }
            ],
            "destinationPath": "ReferenceCode"
        },
        {
            "action": "hardlink",
            "itemType": "file",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo",
            "searchPatterns": [
                {
                    "patternType": "glob",
                    "pattern": "Packages/BusinessLogic/*.cs"
                }
            ],
            "destinationPath": "ReferenceCode"
        },
        {
            "action": "hardlink",
            "itemType": "file",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Docs",
            "searchPatterns": [
                {
                    "patternType": "glob",
                    "pattern": "*payment*.md"
                }
            ],
            "destinationPath": "Documentation"
        },
        {
            "action": "copy",
            "itemType": "file",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Templates",
            "searchPatterns": [
                {
                    "patternType": "path",
                    "pattern": ".gitignore"
                },
                {
                    "patternType": "path",
                    "pattern": ".github/copilot-instructions-payment-service.md"
                }
            ]
        },
        {
            "action": "copy",
            "itemType": "directory",
            "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Templates",
            "searchPatterns": [
                {
                    "patternType": "path",
                    "pattern": ".github/workflows"
                }
            ]
        }
    ],
    "postExecutionCommands": [
        {
            "command": "git init && git add . && git commit -m \"Authentication service workspace from monorepo\"",
            "skipIfPathExists": ".git"
        },
        {
            "command": "git mv \".github/copilot-instructions-payment-service.md\" \".github/copilot-instructions.md\" && git commit -m \"Rename copilot-instructions-payment-service.md to copilot-instructions.md\"",
            "skipIfPathExists": ".github/copilot-instructions.md"
        },
        {
            "command": "code C:/Workspaces/PaymentServiceWorkspace"
        }
    ]
}
```

### Step 2: Execute the Configurations

**For Authentication Service Workspace:**
1. Open VS Code
2. Press `Ctrl+Shift+P` to open Command Palette
3. Type: `FileSystem Link Manager: Execute from Config File`
4. Select your `linkmanager-config-authentication-service.json` file
5. Confirm the operation when prompted

**For Payment Service Workspace:**
1. Repeat the same process
2. Select your `linkmanager-config-payment-service.json` file
3. This creates a separate, focused workspace for payment service development

### Step 3: Verify Results

- **File Count**: You will be prompted with a warning if more than fileCountPromptThreshold (749 by default) files are going to be created
- **GitHub Copilot**: Verify advanced indexing is active (check status bar) - essential for AI agentic development
- **Service Context**: Confirm your target service directory is symlinked (changes will reflect in monorepo)
- **Reference Code**: Verify hardlinked .cs files are available for AI context (Core utilities, models, shared contracts)
- **Tests**: Confirm test directories are symlinked for comprehensive AI-assisted testing
- **Git Repository**: Confirm `.git` folder was created and initial commit made
- **AI Development Ready**: Test that GitHub Copilot can provide intelligent suggestions using both service code and reference context

## ⚙️ Configuration Guide

### Configuration File Structure

The configuration file defines how your workspace will be created. Here's a comprehensive breakdown:

#### Core Settings

```json
{
  "targetDirectoryPath": "string",              // Destination workspace path
  "silentMode": false,                          // Skip user prompts
  "defaultOverwriteBehavior": "overwrite",      // "overwrite" | "skip" | "error"
  "fileCountPromptThreshold": 749,              // Max files before confirmation
  "enableSourceDeduplication": false,           // Remove duplicate operations
  "disableRegexValidation": false,              // Disable pattern validation
  "disableCommandValidation": false             // Disable command validation
}
```

#### File System Operations

Each operation defines how to handle specific files or directories:

```json
{
  "operations": [
    {
      "action": "symlink | hardlink | copy",     // Link type
      "itemType": "file | directory",            // Target type
      "baseDirectoryPath": "string",             // Absolute source base path
      "searchPatterns": [                        // File selection patterns
        {
          "patternType": "glob | regex | ignore-rules-file-path | path",
          "pattern": "string | string[]"        // Pattern or file path (arrays only for 'path' type)
        }
      ],
      "destinationPath": "string",               // Optional: relative to targetDirectoryPath destination
      "fileAttributeAdjustment": {               // Optional: attribute changes
        "readonly": "set | remove | preserve",   // In some monorepo solutions, you may have a readonly flag on multiple files unless they are checked out explicitly by the relevant source control (e.g., TFS). This can create a poor developer experience for linked sources, as they will be pointing to readonly files. You can use this flag to modify file attributes.
        "backupFilePath": "string"               // Backup file path for rollback
      }
    }
  ]
}
```

#### Post-Execution Commands

Automate setup tasks after linking operations:

```json
{
  "postExecutionCommands": [
    {
      "command": "string",                       // Shell command
      "skipIfPathExists": "string",              // Skip condition
      "cwd": "string",                           // Working directory
      "timeoutInMs": 300000,                     // Timeout (5 min default)
      "env": {                                   // Environment variables
        "KEY": "value"
      },
      "shell": true                              // Use shell execution
    }
  ]
}
```

### Pattern Types Explained

#### Path Patterns
For exact file and directory matching (most efficient):

**Enterprise C# Monorepo Example:**
```
C:\Monorepo\EnterpriseMonorepo\Src\Core\
├── Models\           ← matches pattern ["Models", "Validation"]
├── Validation\       ← matches pattern ["Models", "Validation"]
├── Engine\           ← not matched
├── Utilities\        ← not matched
└── Security\         ← not matched
```

```json
{
  "patternType": "path",
  "pattern": ["Models", "Validation"]      // Array of exact directory names when itemType = directory
}
{
  "patternType": "path",
  "pattern": ["Src/Services/AuthenticationService/Program.cs", "Templates/.gitignore"]  // Specific files when itemType = file
}
```

#### Glob Patterns
Most common and user-friendly:
```json
{
  "patternType": "glob",
  "pattern": "*.cs"                           // All C# files
}
{
  "patternType": "glob", 
  "pattern": "{Src,Tests}/**/*.cs"            // C# files in Src or Tests directories
}
{
  "patternType": "glob",
  "pattern": "Src/Services/*Service"          // All service directories
}
{
  "patternType": "glob",
  "pattern": "Tests/UnitTests/Authentication*" // Authentication-related test directories
}
```

#### Regex Patterns
For complex matching:
```json
{
  "patternType": "regex",
  "pattern": "^.*/(Test|Spec).*\\.cs$"        // C# test files
}
{
  "patternType": "regex",
  "pattern": "^.*/Services/.*Service/.*\\.cs$" // Service implementation files
}
```

#### Ignore Rules File
Use existing `.gitignore` or custom ignore files:
```json
{
  "patternType": "ignore-rules-file-path",
  "pattern": "C:/Monorepo/EnterpriseMonorepo/Templates/.gitignore"  // Path to .gitignore file. Rules are resolved relative to baseDirectoryPath
}
```

### Action Types: When to Use What

#### Symlinks (Directories) ✅ **Recommended for Copilot**
- **Best for**: Source code directories you actively edit. Modifications within directories and files are reflected in the monorepo they are linked to.
- **Copilot Indexing**: ✅ **Works perfectly**
- **Use case**: Core application modules, feature directories

```json
{
  "action": "symlink",
  "itemType": "directory",
  "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Src/Services",
  "searchPatterns": [{"patternType": "glob", "pattern": "AuthenticationService"}]
}
```

#### Hardlinks (Files) ✅ **Recommended for Copilot** 
- **Best for**: Individual files you might edit. Modifications are linked to the original files. Note: Adding new files to the monorepo requires rerunning the command to include them. New files added to folders with hardlinks won't be automatically reflected, but you can track them using local Git source control if needed. 
- **Copilot Indexing**: ✅ **Works perfectly**
- **Use case**: Configuration files, package.json, README files, documentation files, or a subset of relevant files from a larger folder

```json
{
  "action": "hardlink", 
  "itemType": "file",
  "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Src/Core",
  "searchPatterns": [{"patternType": "glob", "pattern": "Models/*.cs"}]
}
```

#### Copy ✅ **Good for Reference Material**
- **Best for**: Documentation, references you won't modify, or you do not care about within the context of the original monorepo.
- **Copilot Indexing**: ✅ **Works perfectly**
- **Use case**: API documentation, external libraries

```json
{
  "action": "copy",
  "itemType": "directory", 
  "baseDirectoryPath": "C:/Monorepo/EnterpriseMonorepo/Templates",
  "searchPatterns": [{"patternType": "glob", "pattern": ".github"}]
}
```

#### Symlinks (Files) ⚠️ **Limited Copilot Support**
- **Best for**: Scripts and executables
- **Copilot Indexing**: ⚠️ **At the time of writing, VS Code has trouble indexing these**
- **Extra permissions**: ⚠️ **You may need additional file system permissions to create symlinks to individual files**
- **Use case**: Build scripts and tools. If using VS Code Copilot, it's best to avoid this option.

### Git Repository Quick Setup

Automatically initialize a Git repository with your workspace:

```json
{
  "postExecutionCommands": [
    {
      "command": "git init && git add . && git commit -m \"Initial commit\"",
      "skipIfPathExists": ".git",
      "timeoutInMs": 60000
    },
    {
      "command": "git remote add origin https://github.com/user/repo.git",
      "skipIfPathExists": ".git/refs/remotes/origin"
    }
  ]
}
```

## 🎮 Command Usage

### Execute from Config File (Recommended)

The most flexible approach using JSON configuration files:

1. **Create Configuration**: Save your configuration as a `.json` file
2. **Run Command**: `Ctrl+Shift+P` → `FileSystem Link Manager: Execute from Config File`
3. **Select File**: Choose your configuration file
4. **Confirm**: Review the operation summary and confirm

**Advantages:**
- ✅ Reusable configurations
- ✅ Version control friendly
- ✅ Easy to share with team
- ✅ Complex setups supported

### Execute from Settings

Use VS Code settings for simple, workspace-specific configurations:

1. **Configure Settings**: Open VS Code settings and search for "Filesystem Link Manager"
2. **Set Parameters**: Configure operations directly in settings
3. **Run Command**: `Ctrl+Shift+P` → `FileSystem Link Manager: Execute from Settings`

**Settings Configuration:**
```json
{
  "filesystemLinkManager.config.targetDirectoryPath": "C:/Workspace/MyProject",
  "filesystemLinkManager.config.operations": [
    {
      "action": "symlink",
      "itemType": "directory",
      "baseDirectoryPath": "C:/Source/Project/src",
      "searchPatterns": [
        {
          "patternType": "glob",
          "pattern": "core"
        }
      ]
    }
  ]
}
```

**Advantages:**
- ✅ Integrated with VS Code settings
- ✅ Quick setup for simple scenarios
- ✅ Settings sync across devices

### Log Level Management

Control extension logging for debugging:

**Command**: `Ctrl+Shift+P` → `FileSystem Link Manager: Set Log Level`

**Levels Available:**
- **Error**: Only critical errors
- **Warn**: Errors and warnings  
- **Info**: General information (default)
- **Debug**: Detailed diagnostic information

## 💡 Best Practices

### GitHub Copilot Optimization

#### Stay Under File Limits
- **Target**: Keep workspace under 750 files for automatic advanced indexing
- **Monitor**: Use `fileCountPromptThreshold` to get warnings
- **Strategy**: Link only directories you actively work on

#### Prioritize Important Code
1. **Symlink to directories**: Core application logic (actively developed) or where you want to use most AI development features.
2. **Hardlink to files**: If directories have many files and you want to limit scope, see if you can use hardlinks.
3. **Copy**: Reference materials and documentation
4. **Symlink to files**: This may be useful if you don't use GitHub Copilot AI for development. Otherwise, avoid this option.

#### Use Clear Organization
```json
{
  "destinationPath": "src/core/authentication"  // Meaningful folder structure
}
```

### Performance Optimization

#### Disable Deduplication for Large Sets
```json
{
  "enableSourceDeduplication": false // If the plugin underperforms, try disabling this. Otherwise, keep it enabled.
}
```

### Security Considerations

#### Keep Validations Enabled
```json
{
  "disableRegexValidation": false,     // Prevents unsafe patterns. Disable to bypass validation.
  "disableCommandValidation": false   // Prevents dangerous commands. Disable to bypass validation.
}
```

#### Review Post-Execution Commands
- Always specify `skipIfPathExists` for destructive operations
- Use timeouts for long-running commands

## 🔧 Troubleshooting

### Common Issues

#### Issue: "Permission Denied" on Windows
**Symptoms**: Cannot create symlinks
**Solutions**:
1. Run VS Code as Administrator
2. Enable Developer Mode in Windows Settings
3. Use hardlinks instead for files
4. Check Windows version (symlinks require Windows 10/11)

#### Issue: "File Count Exceeds Threshold"
**Symptoms**: Warning about too many files
**Solutions**:
1. Temporarily increase `fileCountPromptThreshold` or use silentMode
2. Use more specific patterns to reduce the file count
3. Enable `enableSourceDeduplication` to remove duplicates
4. Split the workspace into multiple smaller workspaces

#### Issue: "Symlinks Not Working in Git"
**Symptoms**: Git does not show symlinks as modified files
**Solutions**:
1. Check if you used symlinks instead of hardlinks for files
2. Try configuring Git: `git config core.symlinks true`
3. Consider using hardlinks or directory symlinks, as these typically have fewer issues

#### Issue: "Post-Execution Commands Fail"
**Symptoms**: Commands timeout or fail
**Debug**:
1. Test commands manually in the terminal
2. Check the working directory with the `cwd` parameter
3. Increase `timeoutInMs` for slow operations
4. Enable debug logs to identify syntax or other errors

### Platform-Specific Considerations

#### Windows
- **Symlinks for directories**: May require elevated permissions depending on what you can already access
- **Path Separators**: Use `/` or `\\` in JSON strings
- **Command Shell**: Commands run in `cmd.exe` by default
- **Symlinks for files**: Require elevated permissions or Developer Mode

#### macOS/Linux
- **Symlinks**: Work without special permissions
- **Path Separators**: Use `/` in paths
- **Command Shell**: Commands run in `/bin/sh` by default
- **Testing note**: Linux/macOS systems have not been fully tested with this plugin, as my main use case was for Windows. If you encounter issues, please report them as bugs.

### Debugging Tips

#### Enable Debug Logging
1. Command Palette → `FileSystem Link Manager: Set Log Level`
2. Select "Debug"
3. Check VS Code Output Panel → "FileSystem Link Manager"

#### Validate Configuration
Common JSON issues:
- Missing commas between array elements
- Incorrect path separators for platform
- Unescaped backslashes in Windows paths
- See details in the error log

## 📄 License

This extension is licensed under the MIT License. See the LICENSE file for details.

## 📞 Support

- **Issues**: Report bugs and feature requests on our GitHub repository
- **Documentation**: This README and in-extension help