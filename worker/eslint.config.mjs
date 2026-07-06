import tseslint from 'typescript-eslint'

export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
  },
})
