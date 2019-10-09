import pluginBabel from 'rollup-plugin-babel'
import pluginCommonJS from 'rollup-plugin-commonjs'
import { terser as pluginTerser } from 'rollup-plugin-terser'

export default {
  input: 'src/index.js',

  plugins: [
    pluginCommonJS(),

    pluginBabel({
      exclude: /node_modules/,

      presets: [
        [
          '@babel/preset-env',
          {
            exclude: ['transform-async-to-generator', 'transform-regenerator'],
          },
        ],
      ],

      plugins: ['babel-plugin-transform-async-to-promises'],
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
