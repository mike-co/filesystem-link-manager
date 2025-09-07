# Filesystem Link Manager

**Optimize your large codebase for GitHub Copilot indexing with intelligent file linking and workspace management.**

A VS Code extension that helps developers create efficient workspaces by linking files and directories from large codebases, specifically designed to work within GitHub Copilot's indexing thresholds for optimal AI assistance.

## 🚀 Why Filesystem Link Manager?

### The Large Monorepo Challenge

When working with large monorepos (>750-2500 files), particularly those in TFS or other non-Git source control systems, you face several challenges:

- **GitHub Copilot Indexing Limits**: 
  - **< 750 files**: Advanced automatic local index
  - **750-2500 files**: Advanced local index (manual build required)
  - **> 2500 files**: Basic index with limited AI assistance

- **TFS + Visual Studio 2022 Conflicts**: Visual Studio 2022 defaults to Git source control when a `.git` folder exists, even in TFS-mapped directories, causing workflow disruption and source control conflicts.

- **Monorepo Complexity**: Large monorepos often contain multiple services, packages, and shared libraries, making it difficult to focus on specific areas without loading the entire codebase.

- **Performance Issues**: Full monorepo loading can be extremely slow and resource-intensive, especially with thousands of files across multiple services.

### The Solution

Filesystem Link Manager creates optimized workspaces by selectively linking files and directories from your large monorepo, allowing you to:

✅ **Stay within GitHub Copilot's optimal indexing range** (< 750 files for best AI assistance)
✅ **Utilize AI features while still working in the context of the monorepo** through symlinks/hardlinks connecting to the sources
✅ **Work with specific services/packages** from large TFS monorepos without loading everything  
✅ **Initialize Git repositories** for modern tooling without TFS conflicts  
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

Let's create your first optimized workspace from a large TFS monorepo containing multiple services and shared packages.

### Before: Large TFS Monorepo Structure
```
C:\TFS\EnterpriseMonorepo\         (8000+ files)
├── src\
│   ├── core\
│   │   ├── engine\               (200 files)
│   │   ├── utils\                (150 files)
│   │   ├── models\               (40 files)
│   │   ├── modernization\        (20 files)
│   │   └── ...                   (3000+ other files)
│   ├── services\
│   │   ├── user-service\         (40 files)
│   │   ├── auth-service\         (250 files)
│   │   ├── payment-service\      (400 files)
│   │   ├── notification-service\ (200 files)
│   │   └── ...                   (1500+ other services)
│   ├── shared\
│   │   ├── types\                (50 files)
│   │   ├── constants\            (50 files)
│   │   ├── utilities\            (100 files)
│   │   └── components\           (300 files)
│   └── legacy\
│       ├── reporting-legacy\     (800 files)
│       └── admin-legacy\         (600 files)
├── packages\
│   ├── ui-components\            (100 files)
│   ├── business-logic\           (350 files)
│   └── data-access\              (300 files)
├── docs\                         (200+ files)
├── tests\                        (50+ files)
├── tools\                        (200+ files)
└── config\                       (150+ files)
```

### After: Optimized Workspace Structure
```
C:\Workspaces\UserServiceWorkspace\  (< 750 files total)
├── .git\                            (newly initialized)
├── .gitignore                       (copied)
├── src\
│   ├── core\
│   │   ├── models\                  (symlinked directory)
│   │   └── modernization\           (symlinked directory)
│   ├── services\
│   │   └── user-service\            (symlinked directory)(remove readonly flag if it exists from linked sources)
│   └── shared\
│       ├── types\                   (symlinked directory)
│       └── utilities\               (symlinked directory)
├── hardlinked\
│   └── ui-components\               (hardlinked *.cs files)(remove readonly flag if it exists from linked sources) 
├── md-docs\            (hardlinked .md files)
│   └── *.md
```

### Step 1: Create Configuration File

Create `linkmanager-config.json`:

```json
{
  "targetDirectoryPath": ".",
  "silentMode": false,
  "defaultOverwriteBehavior": "overwrite",
  "fileCountPromptThreshold": 749,
  "operations": [
    {
      "action": "symlink",
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/src",
      "searchPatterns": [
        {
          "patternType": "glob",
          "pattern": "core/mod*"
        },
        {
          "patternType": "path",
          "pattern": ["shared/types", "shared/utilities"]
        }
      ],
      "destinationPath": "src"
    },
    {
      "action": "symlink",
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/src",
      "searchPatterns": [
        {
          "patternType": "glob",
          "pattern": "services/user-service"
        }
      ],
      "destinationPath": "src",
      "fileAttributeAdjustment": {
				"readonly": "remove",
				"backupFilePath": ".backups/user-service-file-attribute-adjustments.csv"
			}
    },
    {
      "action": "hardlink",
      "itemType": "file",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/packages",
      "searchPatterns": [
        {
          "patternType": "glob",
          "pattern": "ui-components/*.cs"
        }
      ],
      "destinationPath": "hardlinked",
      "fileAttributeAdjustment": {
				"readonly": "remove",
				"backupFilePath": ".backups/ui-components-file-attribute-adjustments.csv"
			}
    },
    {
      "action": "hardlink",
      "itemType": "file",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/docs",
      "searchPatterns": [
        {
          "patternType": "glob",
          "pattern": "*.md"
        }
      ],
      "destinationPath": "md-docs"
    },
    {
      "action": "copy",
      "itemType": "file",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo",
      "searchPatterns": [
        {
          "patternType": "path",
          "pattern": ".gitignore"
        }
      ]
    }
  ],
  "postExecutionCommands": [
    {
      "command": "git init && git add . && git commit -m \"User service workspace from TFS monorepo\"",
      "skipIfPathExists": ".git"
    }
  ]
}
```

### Step 2: Execute the Configuration

1. Open VS Code
2. Press `Ctrl+Shift+P` to open Command Palette
3. Type: `FileSystem Link Manager: Execute from Config File`
4. Select your `linkmanager-config.json` file
5. Confirm the operation when prompted

### Step 3: Verify Results

- **File Count**: You will be prompted with a warning if more than fileCountPromptThreshold (749 by default) files are going to be created
- **GitHub Copilot**: Verify advanced indexing is active (check status bar)
- **Git Repository**: Confirm `.git` folder was created and initial commit made
- **File Links**: Test that changes in linked files reflect in both locations

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
  "enableSourceDeduplication": false,          // Remove duplicate operations
  "disableRegexValidation": false,              // Disable pattern validation
  "disableCommandValidation": false            // Disable command validation
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
      "baseDirectoryPath": "string",             // Source base path
      "searchPatterns": [                        // File selection patterns
        {
          "patternType": "glob | regex | ignore-rules-file-path | path",
          "pattern": "string | string[]"        // Pattern or file path (arrays only for 'path' type)
        }
      ],
      "destinationPath": "string",               // Optional: relative destination
      "fileAttributeAdjustment": {               // Optional: attribute changes
        "readonly": "set | remove | preserve",   // In some monorepo solutions, you may have a readonly flag on multiple files unless they are checked out explicitly by the relevant source control (e.g., TFS). This can create a poor developer experience for linked sources, as they will be pointing to readonly files. You can use this flag to modify file attributes.
        "backupFilePath": "string"               // Backup file for rollback
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
      "cwd": "string",                          // Working directory
      "timeoutInMs": 300000,                    // Timeout (5 min default)
      "env": {                                  // Environment variables
        "KEY": "value"
      },
      "shell": true                             // Use shell execution
    }
  ]
}
```

### Pattern Types Explained

#### Path Patterns
For exact file and directory matching (most efficient):

**File System Example:**
```
C:\TFS\EnterpriseMonorepo\src\core\
├── models\           ← matches pattern ["models", "modernization"]
├── modernization\    ← matches pattern ["models", "modernization"]
├── engine\           ← not matched
└── utils\            ← not matched
```

```json
{
  "patternType": "path",
  "pattern": ["models", "modernization"]   // Array of exact directory names when itemType = directory
}
{
  "patternType": "path",
  "pattern": ["src/main.ts", "docs/readme.md"]  // Specific files when itemType = file
}
```

#### Glob Patterns
Most common and user-friendly:
```json
{
  "patternType": "glob",
  "pattern": "*.ts"                    // All TypeScript files
}
{
  "patternType": "glob", 
  "pattern": "{src,test}/**/*.js"      // JS files in src or test directories
}
{
  "patternType": "glob",
  "pattern": "components/**/index.ts"  // All index.ts in components subdirs
}
```

#### Regex Patterns
For complex matching:
```json
{
  "patternType": "regex",
  "pattern": "^.*/.(test|spec)/.ts$"  // Test files
}
```

#### Ignore Rules File
Use existing `.gitignore` or custom ignore files:
```json
{
  "patternType": "ignore-rules-file-path",
  "pattern": ".gitignore"               // Use .gitignore patterns
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
  "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/packages",
  "searchPatterns": [{"patternType": "glob", "pattern": "ui-components"}]
}
```

#### Hardlinks (Files) ✅ **Recommended for Copilot** 
- **Best for**: Subset of individual files you might edit. Modifications are linked to the original files. Note that adding more files to the monorepo will not be reflected here until you rerun the command. The same applies when adding more files to folders that have hardlinks to monorepo files. Those would need to be extracted, but you would be able to use local Git source control to track them if needed. 
- **Copilot Indexing**: ✅ **Works perfectly**
- **Use case**: Configuration files, package.json, README files

```json
{
  "action": "hardlink", 
  "itemType": "file",
  "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo",
  "searchPatterns": [{"patternType": "glob", "pattern": "package.json"}]
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
  "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/docs",
  "searchPatterns": [{"patternType": "glob", "pattern": "api"}]
}
```

#### Symlinks (Files) ⚠️ **Limited Copilot Support**
- **Best for**: Scripts and executables
- **Copilot Indexing**: ⚠️ **At the time of writing, VS Code has trouble indexing these**
- **Extra permissions**: ⚠️ **You may need additional file system permissions to create symlinks to individual files**
- **Use case**: Build scripts, tools

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

## 📚 Real-World Examples

### Example 1: TFS Monorepo Authentication Service Focus

**Problem**: 8000-file enterprise monorepo in TFS, needed focused workspace for authentication service development.

**Source Structure** (from our TFS monorepo):
```
C:\TFS\EnterpriseMonorepo\src\services\auth-service\     (250 files)
C:\TFS\EnterpriseMonorepo\src\shared\types\             (50 files)
C:\TFS\EnterpriseMonorepo\src\shared\utilities\         (100 files)
C:\TFS\EnterpriseMonorepo\packages\ui-components\       (100 files)
```

```json
{
  "targetDirectoryPath": "C:/Workspaces/AuthServiceWorkspace",
  "fileCountPromptThreshold": 749,
  "operations": [
    {
      "action": "symlink",
      "itemType": "directory", 
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/src/services",
      "searchPatterns": [
        {"patternType": "glob", "pattern": "auth-service"}
      ],
      "destinationPath": "src/services"
    },
    {
      "action": "symlink",
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/src/shared",
      "searchPatterns": [
        {"patternType": "path", "pattern": ["types", "utilities"]}
      ],
      "destinationPath": "src/shared"
    },
    {
      "action": "symlink",
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/packages",
      "searchPatterns": [
        {"patternType": "glob", "pattern": "ui-components"}
      ],
      "destinationPath": "packages"
    },
    {
      "action": "copy",
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/docs",
      "searchPatterns": [
        {"patternType": "glob", "pattern": "auth*"}
      ],
      "destinationPath": "docs"
    }
  ],
  "postExecutionCommands": [
    {
      "command": "git init && git add . && git commit -m \"Auth service workspace from TFS monorepo\"",
      "skipIfPathExists": ".git"
    }
  ]
}
```

**Result**: 520 files → Advanced Copilot indexing ✅

### Example 2: TFS Monorepo Multi-Service Development

**Problem**: 8000-file TFS monorepo, needed workspace for user and payment services with shared dependencies.

**Source Structure** (from our TFS monorepo):
```
C:\TFS\EnterpriseMonorepo\src\services\user-service\     (150 files)
C:\TFS\EnterpriseMonorepo\src\services\payment-service\ (200 files)
C:\TFS\EnterpriseMonorepo\packages\business-logic\      (180 files)
C:\TFS\EnterpriseMonorepo\packages\data-access\         (150 files)
```

```json
{
  "targetDirectoryPath": "C:/Workspaces/UserPaymentServices", 
  "operations": [
    {
      "action": "symlink",
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/src/services",
      "searchPatterns": [
        {"patternType": "path", "pattern": ["user-service", "payment-service"]}
      ],
      "destinationPath": "src/services"
    },
    {
      "action": "symlink", 
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/packages",
      "searchPatterns": [
        {"patternType": "path", "pattern": ["business-logic", "data-access"]}
      ],
      "destinationPath": "packages"
    },
    {
      "action": "copy",
      "itemType": "directory",
      "baseDirectoryPath": "C:/TFS/EnterpriseMonorepo/tools",
      "searchPatterns": [
        {"patternType": "glob", "pattern": "*"}
      ],
      "destinationPath": "tools"
    }
  ],
  "postExecutionCommands": [
    {
      "command": "npm install",
      "cwd": "src/services/user-service"
    },
    {
      "command": "git init && git add . && git commit -m \"Multi-service workspace from TFS monorepo\"",
      "skipIfPathExists": ".git"
    }
  ]
}
```

## 💡 Best Practices

### GitHub Copilot Optimization

#### Stay Under File Limits
- **Target**: Keep workspace under 750 files for automatic advanced indexing
- **Monitor**: Use `fileCountPromptThreshold: 749` to get warnings
- **Strategy**: Link only directories you actively work on

#### Prioritize Important Code
1. **Symlink to directories**: Core application logic (actively developed) or where you want to use most AI development features.
2. **Hardlink to files**: If directories have many files and you want to limit scope, see if you can use hardlinks.
3. **Copy**: Reference materials and documentation
4. **Symlink to files**: If you do not develop using GitHub Copilot AI, this functionality may find its uses for your scenarios. Otherwise, ignore it.

#### Use Meaningful Structure
```json
{
  "destinationPath": "src/core/authentication"  // Clear organization
}
```

### Performance Optimization

#### Disable Deduplication for Large Sets
```json
{
  "enableSourceDeduplication": false // If for some reason the plugin underperforms, you could try disabling this. Otherwise, it may be worth keeping it enabled.
}
```

### Security Considerations

#### Keep Validations Enabled
```json
{
  "disableRegexValidation": false,     // Prevent unsafe patterns. Disable if you want to bypass it.
  "disableCommandValidation": false   // Prevent dangerous commands. Disable if you want to bypass it.
}
```

#### Review Post-Execution Commands
- Always specify `skipIfPathExists` for destructive operations
- Use timeouts for long-running commands

### Team Collaboration

#### Version Control Configurations
```bash
# Add to version control
git add linkmanager-config.json

# Share with team
git commit -m "Add Filesystem Link Manager configuration"
```

#### Environment-Specific Paths
Use relative paths when possible:
```json
{
  "targetDirectoryPath": "./optimized",      // The main path where your linked solution will be located. Can be an absolute or relative path. If relative, it will be relative to the VS Code running root directory.
  "baseDirectoryPath": "./source-code",     // Absolute path where the source is located.
  
}
```

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
1. Increase `fileCountPromptThreshold` temporarily
2. Use more specific patterns to reduce file count
3. Enable `enableSourceDeduplication` to remove duplicates
4. Split into multiple smaller workspaces

#### Issue: "GitHub Copilot Not Using Advanced Index"
**Symptoms**: Basic indexing despite <750 files
**Check**:
1. Verify file count: Check VS Code file explorer
2. Force rebuild: Command Palette → `Build Local Workspace Index`
3. Check Copilot status: Status bar → Copilot icon
4. Verify file types: Ensure files are indexable (not binary)

#### Issue: "Symlinks Not Working in Git"
**Symptoms**: Git does not show symlinks as modified files
**Solutions**:
1. Did you use symlinks to files?
2. You could try configuring Git: `git config core.symlinks true`.
3. Consider using hardlinks or symlinks to directories, as you should encounter fewer issues.

#### Issue: "Post-Execution Commands Fail"
**Symptoms**: Commands timeout or fail
**Debug**:
1. Test commands manually in terminal
2. Check working directory with `cwd` parameter
3. Increase `timeoutInMs` for slow operations
4. Turn on debug logs and see if it is a syntax or other type of error.

### Platform-Specific Considerations

#### Windows
- **Symlinks for directories**: May require elevated permissions depending on what you can already access
- **Path Separators**: Use `\\` or `/` in JSON strings
- **Command Shell**: Commands run in `cmd.exe` by default
- **Symlinks for files**: Require elevated permissions or Developer Mode

#### macOS/Linux
- **Symlinks**: Work without special permissions
- **Path Separators**: Use `/` in paths
- **Command Shell**: Commands run in `/bin/sh` by default
- **Testing note**: I have not fully tested Linux/macOS systems with respect to the plugin, as my main use case is for Windows. However, if issues are encountered, please log the bug.

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

#### Test Patterns
Use simple patterns first:
```json
{
  "patternType": "glob",
  "pattern": "*"  // Start simple, then add complexity
}
```

## 📄 License

This extension is licensed under the MIT License. See the LICENSE file for details.

## 📞 Support

- **Issues**: Report bugs and feature requests on our GitHub repository
- **Documentation**: This README and in-extension help

---