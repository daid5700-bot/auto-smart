import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      "public/**",
    ],
  },
  ...nextVitals,
  {
    rules: {
      // These React Compiler migration rules flag the established client-side
      // data-loading and portal patterns. Keep correctness rules enabled while
      // those patterns are refactored incrementally.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default config;
