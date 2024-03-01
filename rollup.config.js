import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json'));

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import metablock from 'rollup-plugin-userscript-metablock';

export default {
    input: 'src/main.ts',
    output: [
        {
            file: 'build/bundle.js',
            format: 'iife'
        },
        {
            file: 'build/bundle.user.js',
            format: 'iife',
            plugins: [
                metablock({
                    file: './meta.json',
                    override: {
                        version: pkg.version,
                        description: pkg.description,
                        author: pkg.author,
                        license: pkg.license
                    }
                })
            ]
        }
    ],
    plugins: [
        typescript({
            compilerOptions: {
                target: 'es6'
            }
        }),
        resolve({
            browser: true,
            exportConditions: ['svelte'],
            extensions: ['.svelte']
        }),
        svelte({
            emitCss: false,
            compilerOptions: {
                css: 'injected'
            },
            preprocess: sveltePreprocess()
        })
    ]
}