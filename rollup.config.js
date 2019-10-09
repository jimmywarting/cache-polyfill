import pluginBabel from 'rollup-plugin-babel'
import pluginCommonJS from 'rollup-plugin-commonjs'
import { terser as pluginTerser } from 'rollup-plugin-terser'

export default {
  input: 'src/index.js',

  plugins: [
    pluginCommonJS(),

    pluginBabel({
      exclude: /node_modules/,
      plugins: ['babel-plugin-async-to-promises'],
    }),

    pluginTerser(),
  ],

  output: {
    sourcemap: true,
    file: 'dist/cache.min.js',
    name: 'cachePolyfill',
    format: 'umd',
  },
}
