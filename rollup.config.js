import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { string } from 'rollup-plugin-string';
import metablock from 'rollup-plugin-userscript-metablock';
import pkg from './package.json' assert { type: "json" };
import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';

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
            name: 'qlc',
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
        typescript(),
        commonjs(),
        json(),
        string({
            include: ['**/*.html', '**/*.css']
        }),
        svelte({
            include: 'hud/**/*.svelte',
            emitCss: false,
            compilerOptions: {
                css: 'injected'
            }
        }),
        resolve({
            browser: true,
            exportConditions: ['svelte'],
            extensions: ['.svelte']
        })
    ]
}