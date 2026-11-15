import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      /*
       * This app loads its data in client components with fetch() inside
       * useEffect (see hooks/useDataTable.ts for the shared version). The
       * rule flags every async loader that eventually calls setState, which
       * is the intended pattern here, so it is off until data fetching moves
       * to a cache or a server component.
       */
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
