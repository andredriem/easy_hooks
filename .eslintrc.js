module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'plugin:react/recommended',
    'standard-with-typescript',
    'plugin:react/jsx-runtime'
  ],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },
  plugins: [
    'react',
    'react-hooks'
  ],
  rules: {
    'max-len': ['error', 120],
    '@typescript-eslint/no-explicit-any': 'error',
    'require-jsdoc': 2,
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  ignorePatterns: ['build/*', '.eslintrc.js']
};