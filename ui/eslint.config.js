import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import functional from 'eslint-plugin-functional';
import prettier from 'prettier'
import hooksPlugin from "eslint-plugin-react-hooks";
import imprt from 'eslint-plugin-import';
export default [
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    modules: true
                },
                ecmaVersion: 'latest',
                project: './tsconfig.json',
            },
        },
        ignores: [
            'snippets.ts',
            'lcov-report/**'
        ],
        plugins: {
            functional,
            import: imprt,
            '@typescript-eslint': ts,
            ts,
            prettier,
            'react-hooks': hooksPlugin
        },
        rules: {
            ...hooksPlugin.configs.recommended.rules,
            ...ts.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": ["warn", {}],
            "@typescript-eslint/no-unused-expressions": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn", // or "error"
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_"
                }
            ]
        }
    }
]
