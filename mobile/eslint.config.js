// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    rules: {
      // Flags idiomatic `axios.create` / `i18n.use` default-member calls.
      'import/no-named-as-default-member': 'off',
    },
  },
]);
