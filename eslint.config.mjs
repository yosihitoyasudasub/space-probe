import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
    {
        ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
    },
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        rules: {
            'react/react-in-jsx-scope': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
];

export default eslintConfig;
