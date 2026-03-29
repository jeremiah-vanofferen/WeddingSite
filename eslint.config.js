import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        File: 'readonly',
        CustomEvent: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // Enforce strict equality
      'eqeqeq': ['error', 'always'],
      // Catch unused variables (warn instead of error for easy adoption)
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // Prevent console.log slipping into production (allow warn/error)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // React 17+ JSX transform — no need to import React in every file
      'react/react-in-jsx-scope': 'off',
      // PropTypes enforced
      'react/prop-types': 'error',
      // Calling setState directly in an effect body is a valid React pattern
      // for initializing state from props/localStorage on mount.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Relax rules for test files
    files: ['src/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        // Node.js global used to stub globals (e.g. global.fetch = vi.fn())
        global: 'writable',
        // Browser APIs available in the jsdom test environment
        CustomEvent: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'react/prop-types': 'off',
    },
  },
];
