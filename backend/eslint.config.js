// Copyright 2026 Jeremiah Van Offeren
const js = require('@eslint/js');

const HEADER = '// Copyright 2026 Jeremiah Van Offeren';
const copyrightHeader = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    messages: { missing: `File must start with: ${HEADER}` },
  },
  create(context) {
    return {
      Program(node) {
        const src = context.sourceCode ?? context.getSourceCode();
        if (src.getText().startsWith(HEADER)) return;
        context.report({
          node,
          messageId: 'missing',
          fix: (fixer) => fixer.replaceTextRange([0, 0], HEADER + '\n'),
        });
      },
    };
  },
};

module.exports = [
  js.configs.recommended,
  {
    files: ['server.js', '__tests__/**/*.js'],
    plugins: {
      'copyright-header': { rules: { required: copyrightHeader } },
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'eqeqeq': ['error', 'always'],
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'copyright-header/required': 'error',
    },
  },
];
