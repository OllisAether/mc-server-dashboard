import pluginVue from 'eslint-plugin-vue'
import unusedImports from 'eslint-plugin-unused-imports'// eslint.config.js
import stylistic from '@stylistic/eslint-plugin'
import vueTsEslintConfig from '@vue/eslint-config-typescript'

export default [
  {
    name: 'app/files-to-lint',
    files: ['src/**/*.{ts,mts,tsx,vue}', 'eslint.config.js'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),

  {
    plugins: {
      '@unused-imports': unusedImports,
      '@stylistic': stylistic,
    },
    rules: {
      '@unused-imports/no-unused-imports': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',

      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/newline-per-chained-call': ['error', {
        ignoreChainWithDepth: 2,
      }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/space-before-function-paren': ['error', 'never'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/spaced-comment': ['error', 'always', {
        line: {
          markers: ['#region', '#endregion', 'region', 'endregion']
        },
      }],
      '@stylistic/arrow-parens': ['error', 'always'],
    },
  }
]
