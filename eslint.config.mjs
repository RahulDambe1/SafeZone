import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextCoreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**', '.data/**'],
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    rules: {
      // Standard subscribe-to-external-store and fetch-on-mount patterns are
      // used across this app (store pub/sub, SSE, provider polling). The new
      // experimental React Compiler lint rules flag these as cascading renders;
      // they are legitimate effect uses here.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
]

export default config