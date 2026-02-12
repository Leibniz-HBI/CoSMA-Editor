import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'prettier'
import hooksPlugin from 'eslint-plugin-react-hooks';
import imprt from 'eslint-plugin-import';
import functional from 'eslint-plugin-functional';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {

        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-expressions": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn", // or "error"
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_"
                }]
        },
        files: ["**/*.ts", "**/*.tsx"],
        plugins: {
            'react-hooks': hooksPlugin,
            prettier,
            import: imprt,
            functional
        }
    },
    {
        ignores: [
            'snippets.ts',
            'lcov-report/**',
            'build/*',
            'src/openapi/**',
        ],
    },
)


// export default [
//     {
//         files:
//         languageOptions: {
//             parser: tsParser,
//             parserOptions: {
//                 ecmaFeatures: {
//                     modules: true
//                 },
//                 ecmaVersion: 'latest',
//                 project: './tsconfig.json',
//             },
//         },
//         plugins: {
//         },
//         rules: {
//                 }
//             ]
//         }
//     }
// ]
