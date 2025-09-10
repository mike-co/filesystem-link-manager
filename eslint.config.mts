import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import tseslintParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";

export default defineConfig([
  // Base JavaScript configuration
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { prettier },
    rules: {
      ...js.configs.recommended.rules
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  },

  // TypeScript configuration
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    ignores: ["./eslint.config.mts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin as any,
      prettier,
      jsdoc: require("eslint-plugin-jsdoc")
    },
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        sourceType: "module",
        ecmaVersion: 2021,
        tsconfigRootDir: __dirname
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        vscode: "readonly" // VS Code API global
      }
    },
    rules: {
      // Core TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/prefer-readonly": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General ESLint rules
      "no-console": "off", // Allow console for extension diagnostics
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "explicit" }],
      // Enforce JSDoc comments on public members
      "jsdoc/require-jsdoc": ["error", {
        publicOnly: true,
        require: {
          ClassDeclaration: true,
          MethodDefinition: true,
          FunctionDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false
        },
        contexts: [
          "publicMethod",
          "publicClassField",
          'TSInterfaceDeclaration',
          'TSTypeAliasDeclaration',
          'TSEnumDeclaration'
        ]
      }]
    }
  },
  // Test TypeScript files configuration
  {
    files: ["src/**/*.test.ts", "test/*.ts", "test/**/*.ts"],
    ignores: ["./eslint.config.mts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin as any,
      prettier
    },
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: ["./tsconfig.tests.json"],
        sourceType: "module",
        ecmaVersion: 2021,
        tsconfigRootDir: __dirname
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
        vscode: "readonly",
        describe: "readonly",
        test: "readonly", 
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly"
      }
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
      "no-unused-expressions": "off",
      "no-console": "off"
    }
  }
]);
